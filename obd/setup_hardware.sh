#!/bin/bash

# Safe Zafira — Environment and Hardware Setup Script
# This script configures the CAN interface, fixes Python dependencies,
# sets up serial permissions for the GPS/GSM modules, and optionally
# creates a virtual CAN interface for testing without a real car.

echo "=================================================="
echo "    Safe Zafira Hardware & Environment Setup      "
echo "=================================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Update and install standard system dependencies
echo ""
echo "[1/4] Checking system dependencies..."
if ! command_exists ip; then
    echo "Installing iproute2 for CAN configuration..."
    sudo apt-get update && sudo apt-get install -y iproute2
else
    echo " ✓ iproute2 is installed."
fi

# 2. Fix Python serial dependencies (common error: 'serial' instead of 'pyserial')
echo ""
echo "[2/4] Ensuring correct Python dependencies..."
# Check if the wrong 'serial' package is installed and remove it
if python3 -c "import serial; print(serial.__file__)" 2>/dev/null | grep -q "serial/__init__.py"; then
    echo "   Found incorrect 'serial' package. Removing it..."
    pip3 uninstall -y serial > /dev/null 2>&1 || true
fi

# Install the necessary pip packages
echo "   Installing required Python packages (pyserial, python-can, pynmea2, etc.)..."
pip3 install -r requirements.txt > /dev/null 2>&1 || \
pip3 install pyserial python-can pynmea2 requests bless opencv-python-headless > /dev/null 2>&1
echo " ✓ Python dependencies installed."


# 3. Configure the UART (Serial) ports for GPS and GSM
echo ""
echo "[3/4] Configuring UART permissions (GPS/GSM)..."
# The user needs to be in the 'dialout' group to use /dev/serial0 without sudo
USER_NAME=$(whoami)
if groups "$USER_NAME" | grep -q "\bdialout\b"; then
    echo " ✓ User '$USER_NAME' is already in the 'dialout' group."
else
    echo "   Adding user '$USER_NAME' to the 'dialout' group..."
    sudo usermod -a -G dialout "$USER_NAME"
    echo "   [!] YOU MUST LOG OUT AND LOG BACK IN for serial permissions to take effect!"
fi

# Optional: Disable Linux serial console on /dev/serial0 if running on Raspberry Pi
# (This is a destructive system change, so we just warn the user instead of doing it automatically)
echo "   [Notice]: If running on Raspberry Pi, ensure the serial console is DISABLED"
echo "             but the serial port hardware is ENABLED via 'sudo raspi-config'."


# 4. Configure the CAN interface
echo ""
echo "[4/4] Configuring CAN Interface..."

read -p "Do you want to setup a VIRTUAL CAN interface for testing? (y/n): " setup_vcan

if [[ "$setup_vcan" == "y" || "$setup_vcan" == "Y" ]]; then
    # Setup vcan0
    echo "   Setting up virtual CAN interface (can0)..."
    sudo modprobe vcan
    sudo ip link add dev can0 type vcan 2>/dev/null || true
    sudo ip link set up can0
    echo " ✓ Virtual interface 'can0' is UP."
else
    # Setup physical CAN adapter (e.g., CANable / MCP2515)
    echo "   Attempting to bring up physical CAN interface (can0) at 500kbps..."
    # Usually requires slcand or native drivers. We'll try the native ip link command first.
    sudo ip link set can0 type can bitrate 500000 2>/dev/null || true
    sudo ip link set up can0 2>/dev/null || true
    
    if ip link show can0 | grep -q "UP"; then
        echo " ✓ Physical interface 'can0' is UP."
    else
        echo " [X] Failed to start 'can0'. Make sure the USB/SPI CAN adapter is plugged in."
        echo "     If using a CANable, you may need to run: sudo slcand -o -c -s6 /dev/ttyACM0 can0"
    fi
fi

echo ""
echo "=================================================="
echo " Setup Complete!"
echo " If you just added yourself to the dialout group,"
echo " remember to restart your terminal session."
echo "=================================================="
echo ""
echo "Starting Telemetry Node..."
echo "--------------------------------------------------"

# Pass any command line arguments passed to the script to the python script
python3 telemetry_node.py "$@"
