#!/usr/bin/env bash

set -euo pipefail

# Initialize CANable as can0 at 500 kbit/s using slcan setting S6.
# Usage:
#   sudo ./init_canable_can0.sh
#   sudo ./init_canable_can0.sh /dev/ttyACM1 can1

SERIAL_DEV="${1:-/dev/ttyACM0}"
IFACE="${2:-can0}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (use sudo)."
  exit 1
fi

if ! command -v slcand >/dev/null 2>&1; then
  echo "slcand not found. Install can-utils first:"
  echo "  sudo apt-get update && sudo apt-get install -y can-utils"
  exit 1
fi

if ! command -v ip >/dev/null 2>&1; then
  echo "ip command not found. Install iproute2 first:"
  echo "  sudo apt-get update && sudo apt-get install -y iproute2"
  exit 1
fi

if [[ ! -e "${SERIAL_DEV}" ]]; then
  echo "Serial device not found: ${SERIAL_DEV}"
  echo "Check cable/udev and run: ls /dev/ttyACM* /dev/ttyUSB*"
  exit 1
fi

echo "[1/4] Cleaning previous CAN state..."
ip link set "${IFACE}" down 2>/dev/null || true
pkill -f "slcand.* ${IFACE}$" 2>/dev/null || true
sleep 0.2

echo "[2/4] Starting slcand (${SERIAL_DEV} -> ${IFACE}, S6=500k)..."
# -o: open in listen/write mode
# -f: stay in foreground until daemonized by -F (not used) but keeps behavior explicit
# -s6: 500 kbit/s CAN bitrate preset
# -t hw: hardware timestamps if available
# -S 3000000: UART speed between host and adapter; CANable supports high UART rates in slcan mode
slcand -o -f -s6 -t hw -S 3000000 "${SERIAL_DEV}" "${IFACE}"

echo "[3/4] Bringing ${IFACE} up..."
ip link set "${IFACE}" txqueuelen 1024
ip link set "${IFACE}" up

echo "[4/4] Verifying link..."
ip -details link show "${IFACE}" | sed -n '1,8p'

echo
echo "CAN interface ${IFACE} is up at 500k (S6)."
