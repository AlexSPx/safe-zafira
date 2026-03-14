"""
gps_reader.py — GY-NEO6MV2 / NEO-6M GPS Module Reader.

Can be used two ways:
  1. Standalone:  python3 gps_reader.py [-p /dev/serial0] [-b 9600]
  2. As a module: import gps_reader and call gps_thread() in a daemon thread.
     Read the latest fix from the shared GpsState instance at any time.
"""

import time
import threading
import logging
import serial
import pynmea2
import argparse
import os
import json

logger = logging.getLogger(__name__)


class GpsState:
    """Thread-safe container for the latest GPS fix data."""

    def __init__(self):
        self._lock = threading.Lock()
        self._data = {
            "latitude":  None,
            "longitude": None,
            "altitude_m": None,
            "speed_knots": None,
            "satellites": None,
            "fix_quality": 0,   # 0 = no fix, 1 = GPS, 2 = DGPS
            "timestamp_utc": None,
        }

    def update(self, **kwargs):
        with self._lock:
            self._data.update(kwargs)

    def snapshot(self) -> dict:
        """Returns a copy of the current GPS state (safe to read from any thread)."""
        with self._lock:
            return dict(self._data)

    @property
    def has_fix(self) -> bool:
        with self._lock:
            return (self._data["fix_quality"] or 0) > 0 and \
                   self._data["latitude"] is not None


# Module-level shared state — telemetry_node.py imports this directly.
gps_state = GpsState()


def gps_thread(port: str = "/dev/serial0", baudrate: int = 9600,
               stop_event: threading.Event = None):
    """
    Background thread that continuously reads NMEA sentences and updates
    the shared `gps_state` object.  Designed to run as a daemon thread.

    Args:
        port:       Serial port path (e.g. /dev/serial0, /dev/ttyAMA0).
        baudrate:   Baud rate; NEO-6M default is 9600.
        stop_event: Optional threading.Event to signal graceful shutdown.
    """
    logger.info(f"[GPS] Starting on {port} @ {baudrate} baud...")
    
    try:
        # timeout=1 prevents buffer overrun on RPi mini-UART;
        # readline() returns b'' if no complete sentence arrives within 1s
        ser = serial.Serial(port=port, baudrate=baudrate, timeout=1)
        logger.info(f"[GPS] Serial port {port} opened OK.")
    except Exception as e:
        logger.error(f"[GPS] Cannot open serial port {port}. (Error: {e})")
        logger.error("[GPS] Check that the port exists on this machine and is readable.")
        return
    
    first_nmea = True
    reopen_attempts = 0

    try:
        while stop_event is None or not stop_event.is_set():
            try:
                raw = ser.readline()
                reopen_attempts = 0   # successful read — reset error counter
            except serial.SerialException as e:
                logger.warning(f"[GPS] Serial read error: {e}")
                # The file descriptor is in an EOF/HUP state (UART FIFO overflow
                # or a spurious hangup).  Continuing to read the same fd just
                # returns empty bytes every call.  We must close and reopen the
                # port to clear the error state and flush the hardware buffer.
                try:
                    ser.close()
                except Exception:
                    pass
                reopen_attempts += 1
                delay = min(2 ** reopen_attempts, 30)
                logger.info(f"[GPS] Reopening {port} in {delay}s "
                            f"(attempt {reopen_attempts})...")
                time.sleep(delay)
                if stop_event is not None and stop_event.is_set():
                    break
                try:
                    ser = serial.Serial(port=port, baudrate=baudrate, timeout=1)
                    ser.reset_input_buffer()
                    logger.info("[GPS] Port reopened OK.")
                except Exception as e2:
                    logger.error(f"[GPS] Cannot reopen {port}: {e2}")
                continue
            except Exception as e:
                logger.warning(f"[GPS] Unexpected read error: {e}")
                time.sleep(1)
                continue

            # Read continuously — no sleep between sentences.
            # Draining the kernel TTY receive buffer as fast as possible is
            # what prevents UART FIFO overflow.  The GPS module outputs at 1 Hz
            # so gps_state updates are naturally rate-limited; adding an
            # artificial sleep here would let the buffer fill up over time.
            #
            # readline() returns b'' on timeout — that's normal, just loop
            if not raw or not raw.strip():
                continue

            line = raw.decode("ascii", errors="replace").strip()

            if not line.startswith("$"):
                continue

            if first_nmea:
                logger.info(f"[GPS] First NMEA sentence: {line[:60]}")
                first_nmea = False

            try:
                msg = pynmea2.parse(line)
            except pynmea2.ParseError:
                continue  # Noisy line — ignore and move on

            # GGA — Fix & altitude data
            if msg.sentence_type == 'GGA':
                # Bug #6 fix: use fix_quality integer instead of float comparison
                fix_q = getattr(msg, "gps_qual", 0) or 0
                try:
                    fix_q = int(fix_q)
                except (TypeError, ValueError):
                    fix_q = 0

                gps_state.update(
                    latitude=msg.latitude if fix_q > 0 else None,
                    longitude=msg.longitude if fix_q > 0 else None,
                    altitude_m=float(msg.altitude) if msg.altitude else None,
                    satellites=msg.num_sats,
                    fix_quality=fix_q,
                    timestamp_utc=str(msg.timestamp) if msg.timestamp else None,
                )
                if fix_q > 0:
                    logger.debug(f"[GPS] Fix: {msg.latitude:.6f}, {msg.longitude:.6f} "
                                 f"alt={msg.altitude}m sats={msg.num_sats}")
                else:
                    logger.debug(f"[GPS] No fix yet (sats={msg.num_sats})")

            # RMC — Speed over ground
            elif msg.sentence_type == 'RMC':
                spd = getattr(msg, "spd_over_grnd", None)
                if spd is not None:
                    try:
                        gps_state.update(speed_knots=float(spd))
                    except (TypeError, ValueError):
                        pass

    finally:
        if ser.is_open:
            ser.close()
        logger.info("[GPS] Serial port closed.")


# ---------------------------------------------------------------------------
# Standalone entry point
# ---------------------------------------------------------------------------
def _standalone_main():
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s",
                        datefmt="%H:%M:%S")

    # Set up dedicated file logger for GPS points
    track_logger = logging.getLogger("gps_track")
    track_logger.propagate = False
    track_handler = logging.FileHandler("logs/gps_track.jsonl", mode="a")
    track_logger.addHandler(track_handler)
    track_logger.setLevel(logging.INFO)

    parser = argparse.ArgumentParser(description="GY-NEO6MV2 GPS Module NMEA Reader")
    parser.add_argument("-p", "--port", default="/dev/serial0",
                        help="Serial port path (default: /dev/serial0)")
    parser.add_argument("-b", "--baudrate", type=int, default=9600,
                        help="Baud rate (NEO-6M default is usually 9600)")
    args = parser.parse_args()

    stop = threading.Event()
    t = threading.Thread(target=gps_thread, args=(args.port, args.baudrate, stop), daemon=True)
    t.start()

    print(f"GPS reader running on {args.port}. Press Ctrl+C to stop.\n")
    try:
        while True:
            time.sleep(1)
            snap = gps_state.snapshot()
            if gps_state.has_fix:
                # Print to terminal
                print(f"[{snap['timestamp_utc']}]  "
                      f"LAT={snap['latitude']:.6f}  LON={snap['longitude']:.6f}  "
                      f"ALT={snap['altitude_m']}m  "
                      f"SPD={snap['speed_knots']} kn  "
                      f"SATS={snap['satellites']}")
                
                # Append to file
                track_logger.info(json.dumps({
                    "time": snap['timestamp_utc'],
                    "lat": snap['latitude'],
                    "lon": snap['longitude'],
                    "alt_m": snap['altitude_m'],
                    "speed_knots": snap['speed_knots'],
                    "sats": snap['satellites']
                }))
            else:
                print(f"[No Fix]  satellites={snap['satellites']}  quality={snap['fix_quality']}")
    except KeyboardInterrupt:
        stop.set()
        t.join(timeout=2)
        print("\nStopped.")


if __name__ == "__main__":
    _standalone_main()
