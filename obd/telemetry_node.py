"""
Safe Zafira — Telemetry Node (Main Entry Point)

Boot sequence:
  1. BLE Pairing (one-time, skipped if already paired)
  2. Start OBD CAN Reader thread (shared data_queue)
  3. Start Server Sender thread (reads queue, analyzes, POSTs JSON array)

Usage:
  python3 telemetry_node.py [-i can0] [--server-url http://...]
"""

import time
import json
import queue
import threading
import logging
import argparse
import requests
from collections import deque
from datetime import datetime

from ble_pairing import run_ble_pairing
from obd_scanner import can_reader_thread
from gps_reader import gps_thread, gps_state  # Bug #5 fix: import GPS module

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s  %(message)s',
    datefmt='%H:%M:%S',
)
logger = logging.getLogger("telemetry")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DEFAULT_SERVER_URL = "http://localhost:8080/api/telemetry"
SEND_INTERVAL = 5.0       # seconds between server pushes
CRASH_DECEL_THRESHOLD = 30  # km/h per second — likely crash
HARD_BRAKE_THRESHOLD = 10   # km/h per second — hard braking / ABS event
FATIGUE_DRIVE_LIMIT = 2 * 3600  # 2 hours continuous driving
DEVICE_CAN_TIMEOUT = 5.0   # seconds without CAN data → device removed alert


# ---------------------------------------------------------------------------
# Danger / Crash Analyzer
# ---------------------------------------------------------------------------
class DangerAnalyzer:
    """
    Consumes raw OBD packets and produces danger/alert events.
    Maintains rolling state for crash detection, fatigue, and device health.
    """

    def __init__(self):
        self.speed_history = deque(maxlen=20)  # (timestamp, speed)
        self.driving_start = None
        self.last_break_time = time.time()
        self.last_packet_time = None

    def analyze(self, packet: dict) -> list[dict]:
        """
        Accepts a single OBD packet dict. Returns a list of alert dicts
        (may be empty if nothing dangerous detected).
        """
        alerts = []
        now = time.time()
        speed = packet.get("speed_kmh", -1)

        self.last_packet_time = now

        # --- 1. Crash Detection (sudden deceleration) ---
        if speed >= 0:
            self.speed_history.append((now, speed))

            if len(self.speed_history) >= 2:
                old_t, old_s = self.speed_history[0]
                new_t, new_s = self.speed_history[-1]
                dt = new_t - old_t
                if dt > 0:
                    decel = (old_s - new_s) / dt
                    if decel >= CRASH_DECEL_THRESHOLD:
                        alerts.append({
                            "type": "CRASH_DETECTED",
                            "severity": "CRITICAL",
                            "deceleration_kmh_s": round(decel, 1),
                            "speed_before": old_s,
                            "speed_after": new_s,
                            "timestamp": packet["timestamp"],
                        })
                        self.speed_history.clear()
                    elif decel >= HARD_BRAKE_THRESHOLD:
                        alerts.append({
                            "type": "HARD_BRAKING",
                            "severity": "WARNING",
                            "deceleration_kmh_s": round(decel, 1),
                            "timestamp": packet["timestamp"],
                        })

        # --- 2. Driver Fatigue ---
        if speed > 0:
            if self.driving_start is None:
                self.driving_start = now
            drive_duration = now - self.driving_start
            if drive_duration > FATIGUE_DRIVE_LIMIT:
                alerts.append({
                    "type": "DRIVER_FATIGUE",
                    "severity": "WARNING",
                    "driving_minutes": round(drive_duration / 60, 1),
                    "timestamp": packet["timestamp"],
                })
        elif speed == 0:
            # If stopped for > 60s, count as a break
            if self.driving_start and (now - self.driving_start) > 60:
                self.driving_start = None
                self.last_break_time = now

        # --- 3. Airbag / ABS from OBD packet ---
        if packet.get("airbags_open"):
            alerts.append({
                "type": "AIRBAG_DEPLOYED",
                "severity": "CRITICAL",
                "timestamp": packet["timestamp"],
            })
        if packet.get("abs_activated"):
            alerts.append({
                "type": "ABS_ACTIVATED",
                "severity": "WARNING",
                "timestamp": packet["timestamp"],
            })

        # --- 4. Low Battery ---
        batt = packet.get("battery_v", -1)
        if 0 < batt < 11.5:
            alerts.append({
                "type": "LOW_BATTERY",
                "severity": "WARNING",
                "voltage": batt,
                "timestamp": packet["timestamp"],
            })

        return alerts

    def check_device_health(self) -> list[dict]:
        """Called periodically; returns alerts if CAN data has gone silent."""
        alerts = []
        if self.last_packet_time and (time.time() - self.last_packet_time) > DEVICE_CAN_TIMEOUT:
            alerts.append({
                "type": "DEVICE_REMOVED",
                "severity": "CRITICAL",
                "seconds_silent": round(time.time() - self.last_packet_time, 1),
                "timestamp": datetime.now().isoformat(),
            })
        return alerts


# ---------------------------------------------------------------------------
# Server Sender Thread
# ---------------------------------------------------------------------------
def server_sender_thread(
    data_queue: queue.Queue,
    command_queue: queue.Queue,
    response_queue: queue.Queue,
    stop_event: threading.Event,
    server_url: str,
):
    """
    Reads OBD packets from the shared data_queue, runs danger analysis,
    merges VIN / DTC metadata, and POSTs a JSON array to the server every
    SEND_INTERVAL seconds.  The JSON array items each contain ALL telemetry
    fields so the server never has to infer missing values.
    """
    logger.info(f"Server sender started → {server_url}")
    analyzer = DangerAnalyzer()
    batch: list[dict] = []
    retry_batch: deque = deque(maxlen=500)  # Bug #3 fix: holds records from failed POSTs
    last_send = time.time()

    # --- Request VIN and DTCs once at startup ---
    # The reader thread needs a moment to connect before it can answer.
    time.sleep(2)
    try:
        command_queue.put_nowait("REQ_VIN")
        command_queue.put_nowait("REQ_DTC")
        logger.info("[Sender] Requested VIN and DTC from OBD reader...")
    except queue.Full:
        logger.warning("[Sender] command_queue full — could not request VIN/DTC")

    # Shared metadata stamped onto every packet
    meta = {
        "vin": None,
        "dtcs": [],
    }
    
    while not stop_event.is_set():
        # --- Collect any VIN / DTC responses ---
        try:
            resp = response_queue.get_nowait()
            if resp["type"] == "VIN_RESPONSE":
                meta["vin"] = resp["data"]
                logger.info(f"[Sender] VIN received: {meta['vin']}")
            elif resp["type"] == "DTC_RESPONSE":
                meta["dtcs"] = resp["data"]
                logger.info(f"[Sender] DTCs received: {meta['dtcs']}")
            response_queue.task_done()
        except queue.Empty:
            pass

        # --- Drain OBD packets from the queue ---
        try:
            raw = data_queue.get(timeout=0.5)

            # Run danger analysis
            alerts = analyzer.analyze(raw)
            for a in alerts:
                if a["severity"] == "CRITICAL":
                    logger.warning(f"🚨 {a['type']}: {a}")

            # Bug #5 fix: stamp the latest GPS fix onto every telemetry record
            gps = gps_state.snapshot()

            # Build a complete, explicit telemetry record
            record = {
                # Identity / time
                "timestamp":          raw.get("timestamp"),
                "vin":                meta["vin"],
                # Powertrain / motion
                "speed_kmh":          raw.get("speed_kmh", -1),
                "fuel_percent":       raw.get("fuel_percent", -1),
                "battery_v":          raw.get("battery_v", -1),
                "mileage_km":         raw.get("mileage_km", -1),
                # Safety
                "brake_level_percent":raw.get("brake_level_percent", 0.0),
                "abs_activated":      raw.get("abs_activated", False),
                "airbags_open":       raw.get("airbags_open", False),
                # Diagnostics
                "dtcs":               meta["dtcs"],
                # Danger events produced by the analyzer
                "alerts":             alerts,
                # GPS (None fields mean no fix yet)
                "gps_latitude":       gps["latitude"],
                "gps_longitude":      gps["longitude"],
                "gps_altitude_m":     gps["altitude_m"],
                "gps_speed_knots":    gps["speed_knots"],
                "gps_satellites":     gps["satellites"],
                "gps_fix":            gps_state.has_fix,
            }

            batch.append(record)
            data_queue.task_done()
        except queue.Empty:
            pass

        # --- Device-health check (CAN silence) ---
        device_alerts = analyzer.check_device_health()
        if device_alerts:
            for a in device_alerts:
                logger.warning(f"🚨 {a['type']}: device silent for {a['seconds_silent']}s")
            batch.append({
                "timestamp": datetime.now().isoformat(),
                "vin":       meta["vin"],
                "alerts":    device_alerts,
            })

        # --- Flush batch to server ---
        if time.time() - last_send >= SEND_INTERVAL and batch:
            payload = batch.copy()
            batch.clear()
            last_send = time.time()
            try:
                logger.info(f"[Sender] POSTing {len(payload)} records to server...")
                resp = requests.post(server_url, json=payload, timeout=5)
                if resp.status_code < 300:
                    logger.info(f"[Sender] Server accepted ({resp.status_code})")
                    retry_batch.clear()  # Confirmed delivery — discard any held retries
                else:
                    logger.warning(f"[Sender] Server {resp.status_code}: {resp.text[:200]}")
                    # Bug #3 fix: keep failed payload for next send attempt
                    retry_batch.extend(payload)
            except requests.RequestException as e:
                logger.error(f"[Sender] Server sync failed: {e} — will retry on next flush")
                # Bug #3 fix: preserve failed records so they are retried next cycle
                retry_batch.extend(payload)

            # Re-inject up to 100 previously failed records into the new batch
            if retry_batch:
                retry_count = min(len(retry_batch), 100)
                batch = list(retry_batch)[:retry_count] + batch
                logger.info(f"[Sender] Re-queued {retry_count} record(s) from retry buffer")

    # Flush remaining records on shutdown
    if batch:
        try:
            requests.post(server_url, json=batch, timeout=3)
        except Exception:
            pass

    logger.info("Server sender stopped.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Safe Zafira Telemetry Node")
    parser.add_argument('-i', '--interface', default='can0', help='CAN interface (default: can0)')
    parser.add_argument('--server-url', default=DEFAULT_SERVER_URL, help='Server endpoint URL')
    parser.add_argument('--gps-port', default='/dev/serial0', help='GPS UART port (default: /dev/serial0)')
    args = parser.parse_args()

    logger.info("=" * 50)
    logger.info("  Safe Zafira — Telemetry Node")
    logger.info("=" * 50)

    # ── Step 1: BLE Pairing (one-time) ───────────────────────────
    logger.info("[BOOT] Step 1/4: BLE Pairing...")
    run_ble_pairing()
    logger.info("[BOOT] BLE Pairing complete ✓")

    # ── Steps 2-4: Start threads ──────────────────────────────────
    data_queue = queue.Queue(maxsize=50)
    command_queue = queue.Queue(maxsize=10)
    response_queue = queue.Queue(maxsize=10)
    stop_event = threading.Event()

    # Bug #5 fix: start GPS as a background daemon thread
    logger.info(f"[BOOT] Step 2/4: Starting GPS reader on {args.gps_port}...")
    gps_daemon = threading.Thread(
        target=gps_thread,
        args=(args.gps_port, 9600, stop_event),
        daemon=True,
    )

    logger.info(f"[BOOT] Step 3/4: Starting OBD reader on {args.interface}...")
    reader = threading.Thread(
        target=can_reader_thread,
        args=(args.interface, data_queue, command_queue, response_queue, stop_event),
        daemon=True,
    )

    logger.info(f"[BOOT] Step 4/4: Starting server sender → {args.server_url}")
    sender = threading.Thread(
        target=server_sender_thread,
        args=(data_queue, command_queue, response_queue, stop_event, args.server_url),
        daemon=True,
    )

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
        gps_daemon.join(timeout=2)
        reader.join(timeout=3)
        sender.join(timeout=3)
        logger.info("Shutdown complete.")


if __name__ == "__main__":
    main()
