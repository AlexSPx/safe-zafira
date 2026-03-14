#!/usr/bin/env python3
"""
driver_attention.py — Lightweight driver attention monitor
Safe Zafira project

Camera is mounted above the steering wheel, facing the driver.
When the driver is attentive (looking at the road ahead), their gaze is
directed roughly toward the camera.  Distraction shows as a downward gaze
(phone/lap) or face turned away; drowsiness shows as closed eyes.

State output:
  AWARE     — face detected, eyes open, gaze directed toward camera (ahead)
  NOT_AWARE — face absent, eyes closed, or gaze directed away/down

Designed to run at 5-10 FPS on a Raspberry Pi 3B using only OpenCV Haar
cascades and NumPy — no heavy ML frameworks needed.

Usage:
  python3 driver_attention.py [--camera 0] [--no-display] [--headless]

Arguments:
  --camera N       Camera index (default: 0)
  --no-display     Suppress the OpenCV preview window
  --headless       Alias for --no-display (for RPi deployment)

RPi note:
  Replace cv2 installation with opencv-python-headless to save ~100 MB.
"""

import cv2
import numpy as np
import time
import argparse
import logging
from collections import deque

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [attention] %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("attention")

# ── Cascade paths (bundled with every OpenCV build) ───────────────────────────
_CASCADE_FACE = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
_CASCADE_EYE  = cv2.data.haarcascades + "haarcascade_eye.xml"

# ── Processing resolution ─────────────────────────────────────────────────────
# 320×240 keeps CPU use low on the RPi 3B while still giving enough detail.
FRAME_W = 320
FRAME_H = 240

# ── Timing ────────────────────────────────────────────────────────────────────
FPS_TARGET       = 8          # frames analysed per second
NO_FACE_TIMEOUT  = 2.5        # seconds before "no face" triggers NOT_AWARE

# ── Eye openness ──────────────────────────────────────────────────────────────
# Eyes are detected by Haar; if none are found for N consecutive frames →
# the driver's eyes are likely closed (drowsy / sleeping).
CONSEC_CLOSED_FRAMES = 10     # ~1.25 s at 8 FPS

# ── Gaze direction ────────────────────────────────────────────────────────────
# Within each detected eye ROI the darkest cluster is the iris/pupil.
# We express its vertical position as a ratio: 0.0 = top edge, 1.0 = bottom.
#
# Camera ABOVE steering wheel geometry:
#   Attentive driver (looking at road):  pupil appears in upper-to-mid portion
#                                        → ratio ≲ GAZE_DOWN_THRESH
#   Distracted driver (looking at lap/phone): pupil sinks to lower portion
#                                        → ratio ≳ GAZE_DOWN_THRESH
#
# Eye vertical centre in face ROI:
#   Normal frontal face: eyes sit in the upper ~40 % of the face box.
#   Head-down posture causes the eye box to slip toward the face centroid.
#   EYE_Y_RATIO_THRESH caps how far down (as fraction of face height) the
#   eye centres may be before we consider the driver to be looking down.
GAZE_DOWN_THRESH  = 0.60      # iris y-ratio above which → looking down
EYE_Y_RATIO_THRESH = 0.55     # eye-centre y / face-height above which → head down

# ── State smoothing ───────────────────────────────────────────────────────────
SMOOTHING_WINDOW  = 12        # majority-vote window (≈1.5 s at 8 FPS)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _to_gray(img: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img


def _pupil_vertical_ratio(eye_roi: np.ndarray) -> float:
    """
    Return the normalised vertical position of the iris/pupil inside *eye_roi*.

    Strategy: blur to remove specular highlights, then locate the darkest
    point — that is the iris centre on a greyscale camera image.

    Returns a float in [0, 1]:  0 = top of ROI, 1 = bottom.
    """
    gray = _to_gray(eye_roi)
    h, w = gray.shape
    if h < 4 or w < 4:
        return 0.5

    # Equalise then blur to suppress reflections and noise
    eq      = cv2.equalizeHist(gray)
    blurred = cv2.GaussianBlur(eq, (7, 7), 0)

    # Darkest point (iris) after equalisation occupies the 10 % darkest area
    _, min_val, _, min_loc = cv2.minMaxLoc(blurred)

    # Refine by finding centroid of the bottom-10th percentile dark pixels
    thresh_val = int(min_val + 0.10 * (255 - min_val))
    _, mask = cv2.threshold(blurred, thresh_val, 255, cv2.THRESH_BINARY_INV)
    moments = cv2.moments(mask)
    if moments["m00"] > 0:
        cy = moments["m01"] / moments["m00"]
    else:
        cy = float(min_loc[1])

    return float(np.clip(cy / h, 0.0, 1.0))


# ─────────────────────────────────────────────────────────────────────────────
# Main monitor class
# ─────────────────────────────────────────────────────────────────────────────

class AttentionMonitor:
    """
    Captures frames, runs face/eye detection, and emits an AWARE / NOT_AWARE
    state at every processed frame.

    The *state* property always holds the latest smoothed value and can be
    read by an external thread (e.g. the telemetry sender in telemetry_node.py).
    """

    def __init__(self, camera_index: int = 0, display: bool = True):
        self._face_cascade = cv2.CascadeClassifier(_CASCADE_FACE)
        self._eye_cascade  = cv2.CascadeClassifier(_CASCADE_EYE)

        if self._face_cascade.empty():
            raise RuntimeError(f"Could not load face cascade from {_CASCADE_FACE}")
        if self._eye_cascade.empty():
            raise RuntimeError(f"Could not load eye cascade from {_CASCADE_EYE}")

        self._cap = cv2.VideoCapture(camera_index)
        if not self._cap.isOpened():
            raise RuntimeError(f"Cannot open camera index {camera_index}")

        # Ask the driver to give us the right resolution; it may be rounded by
        # the OS/driver — we resize explicitly in the loop anyway.
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_W)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
        self._cap.set(cv2.CAP_PROP_BUFFERSIZE,   1)       # avoid stale frames

        self._display            = display
        self._closed_frame_count = 0
        self._last_face_time     = time.monotonic()
        self._state_buf: deque   = deque(maxlen=SMOOTHING_WINDOW)
        self._state              = "INITIALIZING"

    # ── Public property ───────────────────────────────────────────────────────

    @property
    def state(self) -> str:
        """Latest smoothed attention state: 'AWARE' or 'NOT_AWARE'."""
        return self._state

    # ── Internal frame analysis ───────────────────────────────────────────────

    def _analyse(self, frame: np.ndarray) -> tuple:
        """
        Return (raw_state: str, annotated_frame: np.ndarray).
        *annotated_frame* has bounding-box overlays when display is enabled.
        """
        gray  = _to_gray(frame)
        faces = self._face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(55, 55),
            flags=cv2.CASCADE_SCALE_IMAGE,
        )

        # ── No face ───────────────────────────────────────────────────────────
        if len(faces) == 0:
            elapsed = time.monotonic() - self._last_face_time
            if elapsed > NO_FACE_TIMEOUT:
                return "NOT_AWARE", frame
            # Keep prior state for a short grace period
            return self._state if self._state != "INITIALIZING" else "NOT_AWARE", frame

        # ── Largest face wins ─────────────────────────────────────────────────
        fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        self._last_face_time = time.monotonic()

        face_gray  = gray[fy:fy+fh, fx:fx+fw]
        face_color = frame[fy:fy+fh, fx:fx+fw]

        if self._display:
            cv2.rectangle(frame, (fx, fy), (fx+fw, fy+fh), (0, 210, 0), 2)

        # ── Eye detection ─────────────────────────────────────────────────────
        eyes = self._eye_cascade.detectMultiScale(
            face_gray,
            scaleFactor=1.1,
            minNeighbors=6,
            minSize=(18, 18),
        )

        if len(eyes) == 0:
            self._closed_frame_count += 1
            if self._closed_frame_count >= CONSEC_CLOSED_FRAMES:
                return "NOT_AWARE", frame
            # Temporary blink — hold last state
            return self._state if self._state != "INITIALIZING" else "AWARE", frame

        self._closed_frame_count = 0

        # ── Gaze analysis ─────────────────────────────────────────────────────
        gaze_ratios  = []
        head_down    = False

        for (ex, ey, ew, eh) in eyes[:2]:
            # Eye-centre vertical position relative to face height
            eye_center_y_ratio = (ey + eh / 2) / fh
            if eye_center_y_ratio > EYE_Y_RATIO_THRESH:
                head_down = True

            roi = face_color[ey:ey+eh, ex:ex+ew]
            if roi.size == 0:
                continue

            gaze_ratios.append(_pupil_vertical_ratio(roi))

            if self._display:
                cv2.rectangle(face_color, (ex, ey), (ex+ew, ey+eh), (200, 80, 0), 1)

        if head_down:
            return "NOT_AWARE", frame

        if gaze_ratios:
            avg_gaze = float(np.mean(gaze_ratios))
            # Draw a tiny gaze-level indicator
            if self._display:
                bar_x = fx + fw + 6
                bar_h = int(avg_gaze * fh)
                cv2.rectangle(frame, (bar_x, fy), (bar_x+6, fy+fh), (80, 80, 80), 1)
                cv2.rectangle(frame, (bar_x, fy+bar_h-2), (bar_x+6, fy+bar_h+2), (0, 200, 255), -1)

            if avg_gaze > GAZE_DOWN_THRESH:
                return "NOT_AWARE", frame

        return "AWARE", frame

    # ── Main loop ─────────────────────────────────────────────────────────────

    def run(self):
        logger.info("Driver attention monitor started (press 'q' to quit)")

        frame_interval  = 1.0 / FPS_TARGET
        next_frame_time = time.monotonic()

        try:
            while True:
                now = time.monotonic()

                # Rate-limit processing to FPS_TARGET
                if now < next_frame_time:
                    # On macOS / RPi, a short sleep prevents busy-spinning
                    time.sleep(max(0.0, next_frame_time - now - 0.001))
                    continue

                next_frame_time = now + frame_interval

                ret, raw_frame = self._cap.read()
                if not ret:
                    logger.warning("Failed to read frame — retrying")
                    time.sleep(0.1)
                    continue

                frame = cv2.resize(raw_frame, (FRAME_W, FRAME_H))

                raw_state, annotated = self._analyse(frame)

                # Majority-vote smoothing
                self._state_buf.append(raw_state)
                aware_votes  = self._state_buf.count("AWARE")
                self._state  = (
                    "AWARE"
                    if aware_votes > len(self._state_buf) / 2
                    else "NOT_AWARE"
                )

                # Console heartbeat (single line, no scroll)
                print(
                    f"\r[{time.strftime('%H:%M:%S')}] "
                    f"State: {self._state:<12} "
                    f"raw={raw_state:<12}",
                    end="",
                    flush=True,
                )

                if self._display:
                    color  = (0, 200, 0) if self._state == "AWARE" else (0, 0, 220)
                    label  = self._state
                    cv2.putText(
                        annotated, label,
                        (8, FRAME_H - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, color, 2,
                    )
                    cv2.imshow("Driver Attention", annotated)

                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

        except KeyboardInterrupt:
            pass
        finally:
            print()   # newline after the \r heartbeat
            self._cap.release()
            cv2.destroyAllWindows()
            logger.info("Monitor stopped")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Lightweight driver attention monitor (AWARE / NOT_AWARE)"
    )
    parser.add_argument(
        "--camera", type=int, default=0,
        help="Camera index (default: 0)"
    )
    parser.add_argument(
        "--no-display", "--headless",
        dest="headless", action="store_true",
        help="Disable OpenCV preview window (use for headless RPi deployment)"
    )
    args = parser.parse_args()

    monitor = AttentionMonitor(
        camera_index=args.camera,
        display=not args.headless,
    )
    monitor.run()


if __name__ == "__main__":
    main()
