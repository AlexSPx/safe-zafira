import can
import csv
from datetime import datetime

def log_can_data(interface='can0', log_file='can_log.csv'):
    """
    Listens to a CAN interface and logs the data to a CSV file.
    """
    print(f"Starting CAN logger on interface {interface}...")
    
    try:
        # Create a CAN bus interface using SocketCAN (standard for Linux/Raspberry Pi)
        bus = can.interface.Bus(channel=interface, bustype='socketcan')
    except OSError as e:
        print(f"Error opening CAN interface {interface}: {e}")
        print("Make sure the CANable is plugged in and the interface is UP.")
        print("Typical setup commands:")
        print("  sudo slcand -o -c -s6 /dev/ttyACM0 can0")
        print("  sudo ip link set can0 up type can bitrate 500000")
        return

    print(f"Logging data to {log_file} (Press Ctrl+C to stop)")
    
    with open(log_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Timestamp', 'ID (Hex)', 'DLC', 'Data (Hex)'])
        
        try:
            while True:
                # Wait for a message (timeout 1 second to handle Ctrl+C responsively)
                message = bus.recv(timeout=1.0) 
                
                if message is not None:
                    # Format data for readability
                    data_hex = ' '.join(f'{b:02X}' for b in message.data)
                    id_hex = f"{message.arbitration_id:X}"
                    
                    # If message.timestamp is 0.0 or not set, use system time
                    msg_time = message.timestamp if message.timestamp > 0 else datetime.now().timestamp()
                    timestamp_str = datetime.fromtimestamp(msg_time).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
                    
                    # Write to file
                    writer.writerow([timestamp_str, id_hex, message.dlc, data_hex])
                    # Print to console (optional, you can remove this to reduce CPU load)
                    print(f"[{timestamp_str}] ID: 0x{id_hex} | DLC: {message.dlc} | Data: {data_hex}")
                    
        except KeyboardInterrupt:
            print("\nLogging stopped by user.")
        finally:
            bus.shutdown()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Log CAN data from CANable via SocketCAN")
    parser.add_argument('-i', '--interface', default='can0', help='CAN interface to use (default: can0)')
    parser.add_argument('-f', '--file', default=None, help='Output CSV file (default: timestamped filename)')
    args = parser.parse_args()
    
    # Generate timestamped filename if not provided
    filename = args.file if args.file else f"can_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    log_can_data(interface=args.interface, log_file=filename)
