"""
Safe Zafira — Telemetry Node (Main Entry Point)

Boot sequence:
  1. BLE Pairing (one-time, skipped if already paired)
  2. Load JWT token from device_config.json
  3. Start OBD CAN Reader thread (or mock thread if --mock is passed)
  4. Start Server Sender thread — shapes packets to VehicleData format
    and POSTs to /vehicles/data?device=<device_id> with Bearer auth

Usage:
  # Real CAN bus:
  python3 telemetry_node.py -i can0 --server-url http://your-server

  # Mock mode (no hardware required — sends fake OBD data to test upload):
    python3 telemetry_node.py --mock --skip-ble --no-gps --server-url http://localhost:8080

Environment / required config:
  device_config.json — written by ble_pairing.py; contains jwt_token and device_id
"""

import time
import json
import math
import queue
import random
import threading
import logging
import argparse
import requests
from collections import deque
from datetime import datetime

from ble_pairing import run_ble_pairing, load_device_config
from obd_scanner import can_reader_thread
from driver_attention import AttentionMonitor

try:
    from gps_reader import gps_thread, gps_state
    GPS_IMPORT_ERROR = None
except Exception as exc:
    gps_thread = None
    GPS_IMPORT_ERROR = exc

    class _NoGpsState:
        def snapshot(self) -> dict:
            return {
                "latitude": None,
                "longitude": None,
                "altitude_m": None,
                "speed_knots": None,
                "satellites": None,
                "fix_quality": 0,
                "timestamp_utc": None,
            }

    gps_state = _NoGpsState()


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
# Ensure gps_reader and other sub-module loggers propagate to root
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s  %(message)s',
    datefmt='%H:%M:%S',
)
logger = logging.getLogger("telemetry")
# Force the gps_reader logger to INFO so fix messages are visible
logging.getLogger("gps_reader").setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DEFAULT_SERVER_URL   = "http://localhost:8080"
SEND_INTERVAL        = 1.0        # seconds between server POSTs
CRASH_DECEL_THRESHOLD = 30        # km/h/s
HARD_BRAKE_THRESHOLD  = 10        # km/h/s
FATIGUE_DRIVE_LIMIT   = 2 * 3600  # 2 hours
DEVICE_CAN_TIMEOUT    = 5.0       # seconds of CAN silence → device removed


# ---------------------------------------------------------------------------
# Enum strings matching server Dangers enum exactly
# ---------------------------------------------------------------------------
class Dangers:
    CRASH_DETECTED   = "CRASH_DETECTED"
    HARD_BRAKING     = "HARD_BRAKING"
    DRIVER_FATIGUE   = "DRIVER_FATIGUE"
    AIRBAGS_DEPLOYED = "AIRBAGS_DEPLOYED"
    ABS_ACTIVATED    = "ABS_ACTIVATED"
    LOW_BATTERY      = "LOW_BATTERY"
    DRIVER_NOT_AWARE = "DRIVER_NOT_AWARE"   # sustained driver distraction/drowsiness

# How long the driver must be NOT_AWARE continuously before we raise a danger
DRIVER_NOT_AWARE_TIMEOUT = 5.0  # seconds


# ---------------------------------------------------------------------------
# Danger / Crash Analyzer
# ---------------------------------------------------------------------------
class DangerAnalyzer:
    """Stateful analyzer — call .analyze(packet) per packet, returns danger strings."""

    def __init__(self):
        self.speed_history        = deque(maxlen=20)
        self.driving_start        = None
        self.last_packet_time     = None
        # Driver attention tracking
        self._not_aware_since: float | None = None

    def analyze(self, packet: dict, attention_monitor: "AttentionMonitor | None" = None) -> list[str]:
        dangers = []
        now   = time.time()
        speed = packet.get("speed_kmh", -1)
        self.last_packet_time = now

        # 1. Crash / hard brake (deceleration)
        if speed >= 0:
            self.speed_history.append((now, speed))
            if len(self.speed_history) >= 2:
                old_t, old_s = self.speed_history[0]
                new_t, new_s = self.speed_history[-1]
                dt = new_t - old_t
                if dt > 0:
                    decel = (old_s - new_s) / dt
                    if decel >= CRASH_DECEL_THRESHOLD:
                        dangers.append(Dangers.CRASH_DETECTED)
                        self.speed_history.clear()
                    elif decel >= HARD_BRAKE_THRESHOLD:
                        dangers.append(Dangers.HARD_BRAKING)

        # 2. Driver fatigue
        if speed > 0:
            if self.driving_start is None:
                self.driving_start = now
            if (now - self.driving_start) > FATIGUE_DRIVE_LIMIT:
                dangers.append(Dangers.DRIVER_FATIGUE)
        elif speed == 0 and self.driving_start and (now - self.driving_start) > 60:
            self.driving_start = None

        # 3. Airbag / ABS from passive CAN
        if packet.get("airbags_open"):
            dangers.append(Dangers.AIRBAGS_DEPLOYED)
        if packet.get("abs_activated"):
            dangers.append(Dangers.ABS_ACTIVATED)

        # 4. Low car battery
        batt = packet.get("battery_v", -1)
        if 0 < batt < 11.5:
            dangers.append(Dangers.LOW_BATTERY)

        # 5. Driver attention — sustained NOT_AWARE raises a danger
        if attention_monitor is not None:
            if attention_monitor.state == "NOT_AWARE":
                if self._not_aware_since is None:
                    self._not_aware_since = now
                elif (now - self._not_aware_since) >= DRIVER_NOT_AWARE_TIMEOUT:
                    dangers.append(Dangers.DRIVER_NOT_AWARE)
            else:
                self._not_aware_since = None  # driver looked back — reset timer

        return dangers

    def check_device_health(self) -> bool:
        """Returns True if CAN has been silent for too long."""
        return (self.last_packet_time is not None and
                (time.time() - self.last_packet_time) > DEVICE_CAN_TIMEOUT)


# ---------------------------------------------------------------------------
# VehicleData payload builder — matches server Java record exactly
# ---------------------------------------------------------------------------
def build_vehicle_data(raw: dict, dangers: list[str]) -> dict:
    """
    Converts an internal OBD packet into the server's VehicleData JSON format.
    GPS coordinates come from the shared gps_state (updated by gps_thread).
    """
    speed      = raw.get("speed_kmh")
    fuel       = raw.get("fuel_percent")
    battery_v  = raw.get("battery_v")
    airbags    = raw.get("airbags_open")
    abs_active = raw.get("abs_activated")
    dtcs       = raw.get("dtcs", [])

    rpm        = raw.get("rpm")
    steering   = raw.get("steering_angle")
    brake      = raw.get("brake_level_percent")
    mileage    = raw.get("mileage_km")

    # Always pull GPS from the shared live state (not from the OBD packet)
    gps = gps_state.snapshot()
    lat = gps["latitude"]
    lon = gps["longitude"]

    # Exactly matching user's requested specification:
    # Speed: int, RPM: int, Steering: double, Battery: double, Mileage: int,
    # Brake Pedal: bool, AIRBAGS: bool, ABS: bool, location: {x,y}, dtcs: list
    payload: dict = {
        "speed":       int(speed) if speed is not None and speed >= 0 else -1,
        "rpm":         int(rpm) if rpm is not None and rpm >= 0 else -1,
        "steering":    float(round(steering, 1)) if steering is not None else 0.0,
        "battery":     float(round(battery_v, 2)) if battery_v is not None else 13.5,
        "mileage":     int(mileage) if mileage is not None and mileage >= 0 else -1,
        "brakePedal":  bool(brake) if isinstance(brake, bool) else bool(brake > 0) if brake is not None else False,
        "airbags":     bool(airbags) if airbags is not None else False,
        "abs":         bool(abs_active) if abs_active is not None else False,
        "location":    {"x": lat, "y": lon} if lat is not None and lon is not None else None,
        "diagnostics": dtcs if dtcs and dtcs != ["No Errors Found"] else [],
        "dangers":     dangers
    }
    return payload


# ---------------------------------------------------------------------------
# Mock CAN data producer thread
# ---------------------------------------------------------------------------
def mock_can_reader_thread(data_queue: queue.Queue, stop_event: threading.Event):
    """
    Puts a realistic-looking OBD packet into data_queue every ~500ms.
    Use --mock to activate this instead of the real CAN reader.
    The speed slowly oscillates so crash / hard-brake detection can be tested.
    """
    logger.info("[MOCK] Mock CAN reader started — no hardware required.")
    t = 0
    dtcs_sent = False

    while not stop_event.is_set():
        # Oscillate speed between 0 and 120 km/h
        speed = max(0, 60 + 60 * math.sin(t / 30))

        packet = {
            "timestamp":            datetime.now().isoformat(),
            "speed_kmh":            round(speed, 1),
            "rpm":                  2500,
            "steering_angle":       0.0,
            "battery_v":            round(13.8 + random.uniform(-0.1, 0.1), 2),
            "mileage_km":           191082,
            "brake_level_percent":  False,
            "abs_activated":        False,
            "airbags_open":         False,
            "dtcs":                 ["P0420"] if not dtcs_sent else [],
            # No GPS in mock mode
            "gps_latitude":         None,
            "gps_longitude":        None,
        }
        dtcs_sent = True  # only send DTCs on first packet

        try:
            data_queue.put_nowait(packet)
        except queue.Full:
            try:
                data_queue.get_nowait()
                data_queue.put_nowait(packet)
            except queue.Empty:
                pass

        t += 1
        time.sleep(1.0)

    logger.info("[MOCK] Mock CAN reader stopped.")


# ---------------------------------------------------------------------------
# Server Sender Thread
# ---------------------------------------------------------------------------
def server_sender_thread(
    data_queue: queue.Queue,
    command_queue: queue.Queue,
    response_queue: queue.Queue,
    stop_event: threading.Event,
    server_url: str,
    jwt_token: str,
    device_id: str,
    attention_monitor: "AttentionMonitor | None" = None,
):
    """
    Drains OBD packets from data_queue, analyzes dangers, shapes them into
    the server's VehicleData format, and POSTs to /vehicles/data every
    SEND_INTERVAL seconds.  Uses JWT Bearer auth and device query parameter.
    """
    logger.info(f"[Sender] Server sender started → {server_url}/vehicles/data?device=<id>")
    if not jwt_token:
        logger.warning("[Sender] No JWT token — requests will be rejected by the server!")

    analyzer = DangerAnalyzer()
    meta = {"vin": None, "dtcs": []}
    batch: list[dict] = []
    retry_buffer: deque = deque(maxlen=500)
    last_send = time.time()

    # Request DTC once OBD reader is ready
    time.sleep(2)
    try:
        command_queue.put_nowait("REQ_DTC")
        logger.info("[Sender] Requested DTC from OBD reader...")
    except queue.Full:
        pass  # mock mode — no reader listening; that's fine

    headers = {
        "authorization": f"Bearer {jwt_token}",
        "content-type":  "application/json",
    }

    while not stop_event.is_set():
        # Collect VIN / DTC responses
        try:
            resp = response_queue.get_nowait()
            if resp["type"] == "VIN_RESPONSE":
                meta["vin"] = resp["data"]
                logger.info(f"[Sender] VIN: {meta['vin']}")
            elif resp["type"] == "DTC_RESPONSE":
                meta["dtcs"] = resp["data"]
                logger.info(f"[Sender] DTCs: {meta['dtcs']}")
            response_queue.task_done()
        except queue.Empty:
            pass

        # Drain OBD / mock packets
        try:
            raw = data_queue.get(timeout=0.5)
            raw["dtcs"] = meta["dtcs"]  # stamp latest DTCs

            dangers = analyzer.analyze(raw, attention_monitor=attention_monitor)
            for d in dangers:
                logger.warning(f"🚨 Danger: {d}")

            record = build_vehicle_data(raw, dangers)
            batch.append(record)
            data_queue.task_done()
        except queue.Empty:
            pass

        # Device-health: CAN silence
        if analyzer.check_device_health():
            logger.warning("🚨 Danger: DEVICE_REMOVED (CAN silent)")
 
        # Flush batch to server
        if time.time() - last_send >= SEND_INTERVAL and batch:
            # Prepend any failed retries
            if retry_buffer:
                retry_slice = list(retry_buffer)[:100]
                payload = retry_slice + batch
                retry_buffer.clear()
                logger.info(f"[Sender] Including {len(retry_slice)} retry record(s)")
            else:
                payload = batch.copy()

            batch.clear()
            last_send = time.time()

            try:
                logger.info(f"[Sender] POSTing {len(payload)} record(s)...")
                request_url = f"{server_url}/vehicles/data?device={device_id}"
                auth_preview = f"Bearer {jwt_token[:12]}..." if jwt_token else "Bearer <missing>"
                body_json = json.dumps(payload[-1], ensure_ascii=True, separators=(",", ":"))
                logger.info(
                    f"[Sender] Request cmd: POST {request_url} "
                    f"Authorization='{auth_preview}' Content-Type='application/json'"
                )
                logger.info(f"[Sender] Request body: {body_json}")
                # Server endpoint accepts a single VehicleData object; send the latest
                # If the server accepts an array adjust here — currently sends last record
                resp = requests.post(
                    f"{server_url}/vehicles/data",
                    json=payload[-1],  # send latest packet
                    params={"device": device_id},
                    headers=headers,
                    timeout=5,
                )
                if resp.status_code < 300:
                    logger.info(f"[Sender] ✓ Server accepted ({resp.status_code})")
                elif resp.status_code == 401:
                    logger.error("[Sender] ✗ 401 Unauthorized — JWT token invalid or expired!")
                else:
                    logger.warning(f"[Sender] ✗ Server {resp.status_code}: {resp.text[:200]}")
                    retry_buffer.extend(payload[:-1])  # re-queue all but the last
            except requests.RequestException as e:
                logger.error(f"[Sender] Network error: {e} — will retry next cycle")
                retry_buffer.extend(payload)

    # Final flush on shutdown
    if batch:
        try:
            request_url = f"{server_url}/vehicles/data?device={device_id}"
            auth_preview = f"Bearer {jwt_token[:12]}..." if jwt_token else "Bearer <missing>"
            body_json = json.dumps(batch[-1], ensure_ascii=True, separators=(",", ":"))
            logger.info(
                f"[Sender] Request cmd: POST {request_url} "
                f"Authorization='{auth_preview}' Content-Type='application/json'"
            )
            logger.info(f"[Sender] Request body: {body_json}")
            requests.post(f"{server_url}/vehicles/data",
                          json=batch[-1],
                          params={"device": device_id},
                          headers=headers,
                          timeout=3)
        except Exception:
            pass

    logger.info("[Sender] Server sender stopped.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Safe Zafira Telemetry Node")
    parser.add_argument('-i', '--interface', default='can0',
                        help='CAN interface (default: can0)')
    parser.add_argument('--server-url', default=DEFAULT_SERVER_URL,
                        help=f'Server base URL (default: {DEFAULT_SERVER_URL})')
    parser.add_argument('--mock', action='store_true',
                        help='Use mock CAN data instead of real OBD hardware')
    parser.add_argument('--skip-ble', action='store_true',
                        help='Skip BLE pairing (useful with --mock for quick testing)')
    parser.add_argument('--gps-port', default='/dev/serial0',
                        help='GPS UART serial port (default: /dev/serial0)')
    parser.add_argument('--no-gps', action='store_true',
                        help='Disable GPS reader entirely')
    parser.add_argument('--camera', type=int, default=0,
                        help='Camera index for attention monitor (default: 0)')
    parser.add_argument('--headless', action='store_true',
                        help='Disable attention monitor preview window (for RPi)')
    args = parser.parse_args()

    logger.info("=" * 52)
    logger.info("   Safe Zafira — Telemetry Node")
    logger.info("=" * 52)
    if args.mock:
        logger.info("   *** MOCK MODE — no CAN hardware required ***")

    # ── Step 1: BLE Pairing (one-time) ──────────────────────────
    if not args.skip_ble:
        logger.info("[BOOT] Step 1/3: BLE Pairing...")
        run_ble_pairing()
        logger.info("[BOOT] BLE Pairing complete ✓")
    else:
        logger.info("[BOOT] Step 1/3: BLE Pairing skipped (--skip-ble)")

    # ── Step 2: Load JWT + device identity ──────────────────────
    config    = load_device_config()
    jwt_token = config.get("jwt_token", "")
    device_id = config.get("device_id", "unknown-device")

    if jwt_token:
        logger.info(f"[BOOT] JWT token loaded (device_id={device_id})")
    else:
        logger.warning("[BOOT] No JWT token in device_config.json — "
                       "complete BLE pairing first, or see --skip-ble docs.")

    # ── Step 3: Start threads ────────────────────────────────────
    data_queue     = queue.Queue(maxsize=100)
    command_queue  = queue.Queue(maxsize=10)
    response_queue = queue.Queue(maxsize=10)
    stop_event     = threading.Event()

    # ── Driver Attention Monitor ──────────────────────────
    logger.info(f"[BOOT] Step 2/4: Starting driver attention monitor (camera={args.camera})...")
    attention_monitor = None
    try:
        attention_monitor = AttentionMonitor(
            camera_index=args.camera,
            display=not args.headless,
        )
        attention_thread = threading.Thread(
            target=attention_monitor.run,
            daemon=True,
        )
        attention_thread.start()
        logger.info("[BOOT] Driver attention monitor online ✓")
    except Exception as e:
        logger.warning(f"[BOOT] Attention monitor unavailable: {e} — continuing without it")

    # ── GPS + OBD + sender threads ─────────────────────────────────

    gps_daemon = None
    if args.no_gps:
        logger.info("[BOOT] Step 3/4: GPS reader disabled (--no-gps)")
    elif gps_thread is not None:
        logger.info(f"[BOOT] Step 3/4: Starting GPS reader on {args.gps_port}...")
        gps_daemon = threading.Thread(
            target=gps_thread,
            args=(args.gps_port, 9600, stop_event),
            daemon=True,
        )
    else:
        logger.warning(f"[BOOT] GPS reader unavailable: {GPS_IMPORT_ERROR} — continuing without GPS")

    if args.mock:
        logger.info("[BOOT] Step 3/4: Starting mock CAN reader...")
        reader = threading.Thread(
            target=mock_can_reader_thread,
            args=(data_queue, stop_event),
            daemon=True,
        )
    else:
        logger.info(f"[BOOT] Step 3/4: Starting OBD reader on {args.interface}...")
        reader = threading.Thread(
            target=can_reader_thread,
            args=(args.interface, data_queue, command_queue, response_queue, stop_event),
            daemon=True,
        )

    logger.info(f"[BOOT] Step 4/4: Starting server sender → {args.server_url}")
    sender = threading.Thread(
        target=server_sender_thread,
        args=(data_queue, command_queue, response_queue,
              stop_event, args.server_url, jwt_token, device_id,
              attention_monitor),
        daemon=True,
    )

    if gps_daemon is not None:
        gps_daemon.start()
    reader.start()
    sender.start()
    logger.info("[BOOT] All systems online. Press Ctrl+C to stop.")

    try:
        while reader.is_alive() and sender.is_alive():
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        stop_event.set()
    finally:
        if gps_daemon is not None:
            gps_daemon.join(timeout=2)
        reader.join(timeout=3)
        sender.join(timeout=3)
        logger.info("Shutdown complete.")


if __name__ == "__main__":
    main()
