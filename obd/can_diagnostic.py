#!/usr/bin/env python3
"""
can_diagnostic.py — Verify CAN IDs on the real vehicle.

Run this script ON the Raspberry Pi while connected to the car's OBD port.
It performs 4 tests (each ~10 seconds):

  Test 1: Engine on, stationary, no brake
  Test 2: Press and hold brake pedal
  Test 3: Drive slowly (10-20 km/h)
  Test 4: Standard OBD PID support scan

It captures ALL raw CAN traffic and then analyses which IDs changed
between states — giving conclusive proof of which IDs carry speed,
brake, and fuel data on YOUR specific car.

Usage:
  sudo python3 can_diagnostic.py [--interface can0]

Output:
  - logs/diag_raw_<timestamp>.log     (every single CAN frame)
  - logs/diag_report_<timestamp>.txt  (analysis summary)

Share the diag_report file and we'll have the exact IDs and byte mapping.
"""

import can
import time
import os
import sys
import json
import argparse
from collections import defaultdict
from datetime import datetime


def capture_raw(bus, duration, label, log_file):
    """Capture all CAN frames for `duration` seconds."""
    frames = []
    end = time.time() + duration
    count = 0
    print(f"\n{'='*60}")
    print(f"  [{label}]  Capturing for {duration}s ...")
    print(f"{'='*60}")
    while time.time() < end:
        msg = bus.recv(0.05)
        if msg:
            ts = time.time()
            frames.append((ts, msg.arbitration_id, bytes(msg.data)))
            log_file.write(
                f"{ts:.3f}  0x{msg.arbitration_id:03X}  "
                f"[{len(msg.data)}]  {msg.data.hex(' ')}\n"
            )
            count += 1
    print(f"  Captured {count} frames across {len(set(f[1] for f in frames))} unique IDs")
    return frames


def build_stats(frames):
    """For each CAN ID, compute per-byte min/max/change count."""
    stats = {}
    last_seen = {}
    for ts, arb_id, data in frames:
        if arb_id not in stats:
            stats[arb_id] = {
                "count": 0,
                "byte_min": [255]*8,
                "byte_max": [0]*8,
                "byte_changes": [0]*8,
                "last_data": None,
                "first_ts": ts,
                "last_ts": ts,
            }
        s = stats[arb_id]
        s["count"] += 1
        s["last_ts"] = ts
        for i in range(min(len(data), 8)):
            s["byte_min"][i] = min(s["byte_min"][i], data[i])
            s["byte_max"][i] = max(s["byte_max"][i], data[i])
            if s["last_data"] is not None and i < len(s["last_data"]):
                if data[i] != s["last_data"][i]:
                    s["byte_changes"][i] += 1
        s["last_data"] = data
    return stats


def diff_stats(stats_a, stats_b, label_a, label_b):
    """Find bytes whose range changed significantly between two captures."""
    results = []
    all_ids = set(stats_a.keys()) | set(stats_b.keys())
    for arb_id in sorted(all_ids):
        if arb_id not in stats_a or arb_id not in stats_b:
            continue
        sa, sb = stats_a[arb_id], stats_b[arb_id]
        for byte_idx in range(8):
            range_a = sa["byte_max"][byte_idx] - sa["byte_min"][byte_idx]
            range_b = sb["byte_max"][byte_idx] - sb["byte_min"][byte_idx]
            mean_a = (sa["byte_max"][byte_idx] + sa["byte_min"][byte_idx]) / 2
            mean_b = (sb["byte_max"][byte_idx] + sb["byte_min"][byte_idx]) / 2
            mean_diff = abs(mean_b - mean_a)

            # Significant if mean shifted by >10 or range changed a lot
            if mean_diff > 10 or abs(range_b - range_a) > 20:
                results.append({
                    "id": arb_id,
                    "byte": byte_idx,
                    f"mean_{label_a}": f"{mean_a:.0f}",
                    f"mean_{label_b}": f"{mean_b:.0f}",
                    "mean_delta": f"{mean_diff:.0f}",
                    f"range_{label_a}": range_a,
                    f"range_{label_b}": range_b,
                })
    return results


def scan_obd_pids(bus, report_file):
    """Scan which standard OBD-II PIDs the ECU supports."""
    print(f"\n{'='*60}")
    print(f"  [Test 4]  Scanning supported standard OBD-II PIDs ...")
    print(f"{'='*60}")

    supported = []

    # Test key PIDs we care about
    test_pids = [
        (0x01, 0x00, "Supported PIDs [01-20]"),
        (0x01, 0x0C, "Engine RPM"),
        (0x01, 0x0D, "Vehicle Speed"),
        (0x01, 0x2F, "Fuel Tank Level"),
        (0x01, 0x42, "Control Module Voltage"),
        (0x01, 0x11, "Throttle Position"),
        (0x01, 0x05, "Coolant Temperature"),
    ]

    for mode, pid, name in test_pids:
        # Send request
        data = [0x02, mode, pid, 0x55, 0x55, 0x55, 0x55, 0x55]
        msg = can.Message(arbitration_id=0x7DF, data=data, is_extended_id=False)
        bus.send(msg)

        # Wait for response
        deadline = time.time() + 0.5
        got_response = False
        while time.time() < deadline:
            resp = bus.recv(0.05)
            if resp and 0x7E8 <= resp.arbitration_id <= 0x7EF:
                if len(resp.data) >= 3 and resp.data[1] == (mode + 0x40):
                    got_response = True
                    supported.append((mode, pid, name, resp.data.hex(' ')))
                    print(f"  ✓ PID 0x{pid:02X} ({name}): {resp.data.hex(' ')}")
                    break
        if not got_response:
            print(f"  ✗ PID 0x{pid:02X} ({name}): NO RESPONSE")

        time.sleep(0.1)  # Don't flood the bus

    # Toyota proprietary: 0x21/0x29
    print("\n  Testing Toyota proprietary PID 0x21/0x29 (odo+fuel) ...")
    data = [0x02, 0x21, 0x29, 0x55, 0x55, 0x55, 0x55, 0x55]
    msg = can.Message(arbitration_id=0x7C0, data=data, is_extended_id=False)
    bus.send(msg)
    deadline = time.time() + 1.0
    while time.time() < deadline:
        resp = bus.recv(0.05)
        if resp and resp.arbitration_id == 0x7C8:
            print(f"  ✓ Toyota 0x21/0x29: {resp.data.hex(' ')}")
            supported.append((0x21, 0x29, "Toyota ODO+Fuel", resp.data.hex(' ')))
            break
    else:
        print(f"  ✗ Toyota 0x21/0x29: NO RESPONSE")

    return supported


def check_known_ids(stats, report):
    """Check if known Toyota passive IDs are present in the capture."""
    known = {
        0x0B4: "Speed (Toyota common)",
        0x0B6: "Steering Torque",
        0x224: "Brake/ABS (config placeholder)",
        0x245: "Wheel Speeds",
        0x260: "EPS Steering Torque",
        0x398: "Fuel Usage",
        0x611: "Powertrain State 1",
        0x617: "Fuel Level (Toyota common)",
        0x620: "Beep/Chime",
        0x621: "Powertrain State 2",
        0x622: "Powertrain State 3",
        0x7E8: "OBD-II ECU Response",
        0x7C8: "Toyota Proprietary Response",
    }
    report.write("\n\n=== KNOWN TOYOTA CAN IDS PRESENCE ===\n")
    report.write(f"{'ID':>8}  {'Name':30}  {'Present':>8}  {'Count':>8}  {'Hz':>6}\n")
    report.write("-" * 70 + "\n")
    for arb_id, name in sorted(known.items()):
        if arb_id in stats:
            s = stats[arb_id]
            duration = max(0.1, s["last_ts"] - s["first_ts"])
            hz = s["count"] / duration
            report.write(f"  0x{arb_id:03X}  {name:30}  {'YES':>8}  {s['count']:>8}  {hz:>5.1f}\n")
        else:
            report.write(f"  0x{arb_id:03X}  {name:30}  {'NO':>8}  {'-':>8}  {'-':>6}\n")


def main():
    parser = argparse.ArgumentParser(description="CAN Bus Diagnostic Capture for Toyota Yaris")
    parser.add_argument("--interface", default="can0", help="CAN interface (default: can0)")
    parser.add_argument("--duration", type=int, default=10, help="Capture duration per test (default: 10s)")
    args = parser.parse_args()

    os.makedirs("logs", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    raw_path = f"logs/diag_raw_{timestamp}.log"
    report_path = f"logs/diag_report_{timestamp}.txt"

    print("""
╔══════════════════════════════════════════════════════════════╗
║           CAN Bus Diagnostic Capture — Toyota Yaris          ║
║                                                              ║
║  This script runs 4 tests to identify which CAN IDs carry    ║
║  speed, brake, and fuel data on YOUR specific vehicle.       ║
║                                                              ║
║  ⚠️  The engine must be RUNNING for all tests.                ║
║  ⚠️  Tests 1-3 capture passive CAN traffic.                  ║
║  ⚠️  Test 4 sends standard OBD-II queries.                   ║
╚══════════════════════════════════════════════════════════════╝
""")

    try:
        bus = can.interface.Bus(channel=args.interface, bustype='socketcan')
    except OSError as e:
        print(f"ERROR: Cannot open {args.interface}: {e}")
        print("Make sure CAN interface is up: sudo ip link set can0 up type can bitrate 500000")
        sys.exit(1)

    raw_file = open(raw_path, 'w')
    report = open(report_path, 'w')
    report.write(f"CAN Diagnostic Report — {datetime.now().isoformat()}\n")
    report.write(f"Interface: {args.interface}\n")
    report.write(f"Duration per test: {args.duration}s\n\n")

    try:
        # ── Test 1: Idle, no brake ──
        input("▶  Test 1: Engine ON, stationary, foot OFF brake. Press Enter when ready...")
        frames_idle = capture_raw(bus, args.duration, "IDLE / No Brake", raw_file)
        stats_idle = build_stats(frames_idle)

        # ── Test 2: Brake pressed ──
        input("\n▶  Test 2: PRESS and HOLD brake pedal firmly. Press Enter when ready...")
        frames_brake = capture_raw(bus, args.duration, "BRAKE PRESSED", raw_file)
        stats_brake = build_stats(frames_brake)

        # ── Test 3: Driving ──
        input("\n▶  Test 3: Drive slowly (10-30 km/h). Press Enter when ready...")
        frames_drive = capture_raw(bus, args.duration, "DRIVING", raw_file)
        stats_drive = build_stats(frames_drive)

        # ── Test 4: OBD PID scan ──
        supported_pids = scan_obd_pids(bus, report)

        # ── Analysis ──
        print(f"\n{'='*60}")
        print(f"  ANALYSIS")
        print(f"{'='*60}")

        # Diff idle vs brake → find brake ID
        brake_diffs = diff_stats(stats_idle, stats_brake, "idle", "brake")
        report.write("\n=== BRAKE ANALYSIS (idle vs brake pressed) ===\n")
        if brake_diffs:
            report.write(f"{'ID':>8}  {'Byte':>5}  {'Mean Idle':>10}  {'Mean Brake':>11}  {'Delta':>6}\n")
            report.write("-" * 50 + "\n")
            for d in sorted(brake_diffs, key=lambda x: float(x["mean_delta"]), reverse=True):
                report.write(f"  0x{d['id']:03X}  {d['byte']:>5}  {d['mean_idle']:>10}  "
                             f"{d['mean_brake']:>11}  {d['mean_delta']:>6}\n")
                print(f"  BRAKE candidate: 0x{d['id']:03X} byte {d['byte']} "
                      f"(idle={d['mean_idle']}, brake={d['mean_brake']}, delta={d['mean_delta']})")
        else:
            report.write("No significant differences found.\n")
            print("  No obvious brake signal detected — may need longer capture.")

        # Diff idle vs driving → find speed ID
        speed_diffs = diff_stats(stats_idle, stats_drive, "idle", "drive")
        report.write("\n\n=== SPEED ANALYSIS (idle vs driving) ===\n")
        if speed_diffs:
            report.write(f"{'ID':>8}  {'Byte':>5}  {'Mean Idle':>10}  {'Mean Drive':>11}  {'Delta':>6}\n")
            report.write("-" * 50 + "\n")
            for d in sorted(speed_diffs, key=lambda x: float(x["mean_delta"]), reverse=True):
                report.write(f"  0x{d['id']:03X}  {d['byte']:>5}  {d['mean_idle']:>10}  "
                             f"{d['mean_drive']:>11}  {d['mean_delta']:>6}\n")
                print(f"  SPEED candidate: 0x{d['id']:03X} byte {d['byte']} "
                      f"(idle={d['mean_idle']}, drive={d['mean_drive']}, delta={d['mean_delta']})")
        else:
            report.write("No significant differences found.\n")
            print("  No obvious speed signal detected — may need faster driving.")

        # Check known IDs
        all_stats = build_stats(frames_idle + frames_brake + frames_drive)
        check_known_ids(all_stats, report)

        # OBD PID support
        report.write("\n\n=== OBD-II PID SUPPORT ===\n")
        for mode, pid, name, raw in supported_pids:
            report.write(f"  0x{pid:02X} ({name}): {raw}\n")

        # Summary of ALL unique IDs seen
        report.write("\n\n=== ALL UNIQUE CAN IDs SEEN ===\n")
        report.write(f"{'ID':>8}  {'Count':>8}  {'Hz':>6}  {'Byte Ranges (min-max per byte)':40}\n")
        report.write("-" * 80 + "\n")
        for arb_id in sorted(all_stats.keys()):
            s = all_stats[arb_id]
            duration = max(0.1, s["last_ts"] - s["first_ts"])
            hz = s["count"] / duration
            ranges = "  ".join(
                f"{s['byte_min'][i]:02X}-{s['byte_max'][i]:02X}"
                for i in range(8)
            )
            report.write(f"  0x{arb_id:03X}  {s['count']:>8}  {hz:>5.1f}  {ranges}\n")

    finally:
        raw_file.close()
        report.close()
        bus.shutdown()

    print(f"\n{'='*60}")
    print(f"  DONE!")
    print(f"  Raw capture: {raw_path}")
    print(f"  Report:      {report_path}")
    print(f"{'='*60}")
    print(f"\nShare the report file and we'll nail down the exact IDs.")


if __name__ == "__main__":
    main()
