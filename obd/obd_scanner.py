import can
import time
import struct
import threading
import queue
import json
import os
from datetime import datetime

# Standard OBD-II Request and Response IDs for CAN (11-bit)
OBD_REQUEST_ID = 0x7DF
OBD_RESPONSE_BASE = 0x7E8  # Engine ECU usually responds here

# Modes
MODE_CURRENT_DATA = 0x01
MODE_REQUEST_DTC = 0x03
MODE_VEHICLE_INFO = 0x09

# Mode 01 PIDs
PID_VEHICLE_SPEED = 0x0D
PID_FUEL_LEVEL = 0x2F
PID_CONTROL_MODULE_VOLTAGE = 0x42
PID_ODOMETER = 0xA6             # May not be supported on all cars

# Mode 09 PIDs
PID_VIN = 0x02


CONFIG_FILE = "car_config.json"

def load_config():
    """Loads the permanent car configuration file."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            print(f"[Config] Error parsing config: {e}")
    print("[Config] No valid config found. Using standard generic fallback.")
    return {}

class PassiveCANListener(can.Listener):
    """Listens passively to all CAN messages and checks for specific IDs defined in config."""
    def __init__(self, config):
        self.abs_activated = False
        self.airbags_open = False
        self.brake_level = 0.0
        
        msgs = config.get("can_messages", {})
        
        # Parse hex IDs safely
        try: self.abs_id = int(msgs.get("abs_activated", {}).get("id", "0xFFFFFF"), 16)
        except: self.abs_id = -1
        
        try: self.airbags_id = int(msgs.get("airbags_open", {}).get("id", "0xFFFFFF"), 16)
        except: self.airbags_id = -1
        
        try: self.brake_id = int(msgs.get("brake_status", {}).get("id", "0xFFFFFF"), 16)
        except: self.brake_id = -1
        
        self.abs_cfg = msgs.get("abs_activated", {})
        self.airbags_cfg = msgs.get("airbags_open", {})
        self.brake_cfg = msgs.get("brake_status", {})

    def on_message_received(self, msg):
        # 1. Check for passive Brake Pedal Data
        if msg.arbitration_id == self.brake_id:
            idx = self.brake_cfg.get("byte_index", 2)
            if len(msg.data) > idx:
                # Assuming 0-255 maps to 0-100%
                self.brake_level = min(100.0, (msg.data[idx] * 100) / 255.0)
                
        # 2. Check for passive ABS Activation
        if msg.arbitration_id == self.abs_id:
            idx = self.abs_cfg.get("byte_index", 1)
            active_val = int(self.abs_cfg.get("active_value", "0x01"), 16)
            if len(msg.data) > idx:
                self.abs_activated = (msg.data[idx] == active_val)
                
        # 3. Check for passive Airbags Deployed
        if msg.arbitration_id == self.airbags_id:
            idx = self.airbags_cfg.get("byte_index", 0)
            active_val = int(self.airbags_cfg.get("active_value", "0xFF"), 16)
            if len(msg.data) > idx:
                self.airbags_open = (msg.data[idx] == active_val)


def send_obd_request(bus, mode, pid=None):
    """Sends an OBD-II request over CAN. PID is optional for some modes like 03."""
    if pid is not None:
        data = [0x02, mode, pid, 0x00, 0x00, 0x00, 0x00, 0x00]
    else:
        data = [0x01, mode, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
        
    msg = can.Message(arbitration_id=OBD_REQUEST_ID, data=data, is_extended_id=False)
    try:
        bus.send(msg)
    except can.CanError as e:
        pass


def decode_dtc(high_byte, low_byte):
    """Decodes two bytes into a standard OBD-II DTC string (e.g. P0133)."""
    if high_byte == 0 and low_byte == 0:
        return None
        
    first_char_map = {0: 'P', 1: 'C', 2: 'B', 3: 'U'}
    first_char = first_char_map.get((high_byte >> 6) & 0x03, 'P')
    second_char = str((high_byte >> 4) & 0x03)
    third_char = f"{(high_byte & 0x0F):X}"
    fourth_char = f"{(low_byte >> 4 & 0x0F):X}"
    fifth_char = f"{(low_byte & 0x0F):X}"
    
    return f"{first_char}{second_char}{third_char}{fourth_char}{fifth_char}"


def parse_dtc_response(bus):
    """
    Sends a Mode 03 request and parses the DTCs.
    Can be single-frame (up to 3 DTCs) or multi-frame.
    """
    send_obd_request(bus, MODE_REQUEST_DTC)
    
    dtcs = []
    timeout = time.time() + 2.0
    
    dtc_bytes = bytearray()
    
    while time.time() < timeout:
        msg = bus.recv(0.5)
        if not msg or msg.arbitration_id < 0x7E8 or msg.arbitration_id > 0x7EF:
            continue
            
        data = msg.data
        if not data: continue
        
        pci = data[0] >> 4
        
        # Mode 3 response is Mode + 0x40 = 0x43
        if pci == 0:  # Single frame
            if data[1] == 0x43:
                num_dtcs = data[2]
                dtc_bytes.extend(data[3:3 + (num_dtcs * 2)])
                break
                
        elif pci == 1: # First frame multi-frame
            if data[2] == 0x43:
                num_dtcs = data[3]
                dtc_bytes.extend(data[4:8])
                # Send Flow Control
                fc_msg = can.Message(arbitration_id=OBD_REQUEST_ID, data=[0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], is_extended_id=False)
                bus.send(fc_msg)
                
        elif pci == 2: # Consecutive frame
            dtc_bytes.extend(data[1:])
            # We break aggressively here since we just want whatever we collected quickly for safety
            if len(dtc_bytes) >= 6: # Roughly enough for 3 minimum 
                break
                
    # Parse the bytes 2 at a time into string DTCs
    for i in range(0, len(dtc_bytes) - 1, 2):
        code = decode_dtc(dtc_bytes[i], dtc_bytes[i+1])
        if code:
            dtcs.append(code)
            
    return list(set(dtcs)) if dtcs else ["No Errors Found"]


def parse_vin_response(bus):
    """
    Parses a multi-frame OBD-II response for the VIN.
    VINs are 17 characters long, so they require ISO-TP multi-frame (First Frame, Consecutive Frames).
    """
    send_obd_request(bus, MODE_VEHICLE_INFO, PID_VIN)
    
    vin_bytes = bytearray()
    expected_length = 0
    
    timeout = time.time() + 2.0
    while time.time() < timeout:
        msg = bus.recv(0.5)
        if not msg or msg.arbitration_id < 0x7E8 or msg.arbitration_id > 0x7EF:
            continue
            
        data = msg.data
        if not data: continue
        
        pci = data[0] >> 4
        
        if pci == 0:  # Single Frame (Unusual for VIN, but possible if short)
            if data[1] == 0x49 and data[2] == PID_VIN:
                length = data[0] & 0x0F
                # data[3] is the number of reporting items, data[4:] is the VIN
                vin_bytes.extend(data[4:1+length])
                break
                
        elif pci == 1: # First Frame
            expected_length = ((data[0] & 0x0F) << 8) | data[1]
            if data[2] == 0x49 and data[3] == PID_VIN:
                vin_bytes.extend(data[5:8])
                # Send Flow Control frame to tell ECU to send the rest
                fc_msg = can.Message(arbitration_id=OBD_REQUEST_ID, data=[0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], is_extended_id=False)
                bus.send(fc_msg)
                
        elif pci == 2: # Consecutive Frame
            vin_bytes.extend(data[1:])
            # Filter the VIN to valid ASCII
            if len(vin_bytes) >= 17:
                break
                
    if len(vin_bytes) >= 17:
        # VIN usually contains padded nulls or count bytes, we extract ASCII 
        vin = ''.join(chr(b) for b in vin_bytes if 32 <= b <= 126)
        # Ensure it's exactly 17 characters
        return vin[-17:]
    
    return "Unknown/Unsupported"


def trigger_beep(bus, config):
    """Sends a specific CAN message defined in config to trigger the horn or chime.
    Repeats the message several times to ensure the car registers the command.
    """
    beep_cfg = config.get("can_messages", {}).get("beep_trigger", None)
    
    if not beep_cfg:
        print("\n[CAN Writer] No BEEP CAN message configured in car_config.json!")
        return

    try:
        # Some CAN tools require hex without '0x', so we ensure safe conversion
        raw_id = beep_cfg.get("id", "0x123")
        arb_id = int(raw_id, 16) if isinstance(raw_id, str) else raw_id
        
        data_hex = beep_cfg.get("data", ["0x00"] * 8)
        data_bytes = [int(x, 16) if isinstance(x, str) else x for x in data_hex]
        
        # Ensure we only have up to 8 bytes for standard CAN
        data_bytes = data_bytes[:8]
        
        is_ext = beep_cfg.get("is_extended_id", False)

        print(f"\n[CAN Writer] 🔊 SENDING BEEP COMMAND -> ID: 0x{arb_id:X} | Data: {[hex(b) for b in data_bytes]} | Ext: {is_ext}")

        beep_msg = can.Message(
            arbitration_id=arb_id,
            data=data_bytes,
            is_extended_id=is_ext
        )
        
        # Car ECUs usually expect a continuous stream for a short duration to trigger chimes/horns
        for _ in range(5):
            bus.send(beep_msg)
            time.sleep(0.1)
            
    except Exception as e:
        print(f"[CAN Writer] Failed to send beep command: {e}")


def request_and_read(bus, mode, pid, parser_func):
    """Sends a request, waits for a response, and parses it."""
    send_obd_request(bus, mode, pid)
    
    timeout = time.time() + 0.2
    while time.time() < timeout:
        msg = bus.recv(0.05)
        if msg and 0x7E8 <= msg.arbitration_id <= 0x7EF:
            # Check if this is the response to our PID
            if msg.data[1] == (mode + 0x40) and msg.data[2] == pid:
                return parser_func(msg.data)
    return None

# --- PARSERS ---

def find_data_offset(data, mode, pid):
    """Finds where the actual data starts by looking for the Mode+0x40 and PID bytes."""
    try:
        # data[0] is usually the length of the valid ISO-TP payload
        
        # In a standard response: 
        # data[1] = 0x41 (Mode 1 response)
        # data[2] = PID
        if data[1] == (mode + 0x40) and data[2] == pid:
            return 3
            
        # Sometimes there's an extra padding byte or PCI byte shifting it
        # Try searching for the sequence
        for i in range(len(data) - 1):
            if data[i] == (mode + 0x40) and data[i+1] == pid:
                return i + 2
    except IndexError:
        pass
    return None

def parse_speed(data):
    offset = find_data_offset(data, MODE_CURRENT_DATA, PID_VEHICLE_SPEED)
    if offset and offset < len(data):
        return data[offset] # km/h (int)
    return None

def parse_fuel(data):
    offset = find_data_offset(data, MODE_CURRENT_DATA, PID_FUEL_LEVEL)
    if offset and offset < len(data):
        return (data[offset] * 100) / 255.0 # %
    return None

def parse_voltage(data):
    offset = find_data_offset(data, MODE_CURRENT_DATA, PID_CONTROL_MODULE_VOLTAGE)
    if offset and offset + 1 < len(data):
        return ((data[offset] * 256) + data[offset+1]) / 1000.0 # V
    return None

def parse_odometer(data):
    offset = find_data_offset(data, MODE_CURRENT_DATA, PID_ODOMETER)
    # Distance is 4 bytes
    if offset and offset + 3 < len(data):
        return (data[offset] * (2**24) + data[offset+1] * (2**16) + data[offset+2] * (2**8) + data[offset+3]) / 10.0 # km
    return None


# --- THREAD 1: CAN Data Producer & Command Executor ---
def can_reader_thread(interface, data_queue, command_queue, response_queue, stop_event):
    """
    Continuously polls the CAN bus for live data and calculates physics-based events.
    Packs the data and sends it to the queue every 500ms.
    Reads config file, spawns background listener, and executes commands.
    """
    config = load_config()
    veh = config.get("vehicle", {})
    if veh:
        print(f"[Reader] Identified Configured Vehicle: {veh.get('year')} {veh.get('make')} {veh.get('model')}")

    print(f"[Reader] Connecting to OBD-II via {interface}...")
    try:
        bus = can.interface.Bus(channel=interface, bustype='socketcan')
    except OSError as e:
        print(f"[Reader] Error opening interface: {e}")
        stop_event.set()
        return

    # Set up background listener for passive variables (abs, brakes, airbags)
    listener = PassiveCANListener(config)
    notifier = can.Notifier(bus, [listener])

    last_speed = 0
    last_time = time.time()
    
    print("[Reader] Polling started.")
    
    while not stop_event.is_set():
        loop_start_time = time.time()
        
        # 0. Check for commands from the Consumer Thread (like BEEP, REQ_VIN, REQ_DTC)
        try:
            command = command_queue.get_nowait()
            if command == "BEEP":
                trigger_beep(bus, config)
            elif command == "REQ_VIN":
                print("\n[Reader] Consumer requested VIN. Querying car...")
                vin = parse_vin_response(bus)
                
                # Send it back to the consumer via the response queue
                try:
                    response_queue.put_nowait({"type": "VIN_RESPONSE", "data": vin})
                except queue.Full:
                    pass
            elif command == "REQ_DTC":
                print("\n[Reader] Consumer requested Engine Codes (DTCs). Querying car...")
                dtcs = parse_dtc_response(bus)
                
                # Send it back to the consumer via the response queue
                try:
                    response_queue.put_nowait({"type": "DTC_RESPONSE", "data": dtcs})
                except queue.Full:
                    pass
                
            command_queue.task_done()
        except queue.Empty:
            pass
        
        # 1. Read Raw Active OBD Data
        current_speed = request_and_read(bus, MODE_CURRENT_DATA, PID_VEHICLE_SPEED, parse_speed)
        fuel = request_and_read(bus, MODE_CURRENT_DATA, PID_FUEL_LEVEL, parse_fuel)
        voltage = request_and_read(bus, MODE_CURRENT_DATA, PID_CONTROL_MODULE_VOLTAGE, parse_voltage)
        mileage = request_and_read(bus, MODE_CURRENT_DATA, PID_ODOMETER, parse_odometer)
        
        # Note: We pull brake level directly from the passive CAN listener instead of OBD polling!
        brake_level = listener.brake_level
        
        # 2. Physics / Safety Calculations (Fallback if passive CAN isn't working)
        abs_activated = listener.abs_activated
        airbags_open = listener.airbags_open
        
        if current_speed is not None:
            current_time = time.time()
            time_diff = current_time - last_time
            
            if time_diff > 0:
                deceleration = (last_speed - current_speed) / time_diff
                
                # Flag Logic based on deceleration (Physics fallback overrides to True if physical drop implies crash)
                if deceleration > 30: 
                    airbags_open = True
                    abs_activated = True
                elif deceleration > 10:
                    abs_activated = True
                
            last_speed = current_speed
            last_time = current_time

        # 3. Create Data Packet
        # If fuel is None, it means the Toyota does not support the standard OBD-II PID 0x2F
        packet = {
            "timestamp": datetime.now().isoformat(),
            "speed_kmh": current_speed if current_speed is not None else -1,
            "fuel_percent": round(fuel, 1) if fuel is not None else -1,
            "battery_v": round(voltage, 2) if voltage is not None else -1,
            "mileage_km": round(mileage, 1) if mileage is not None else -1,
            "brake_level_percent": round(brake_level, 1),
            "abs_activated": abs_activated,
            "airbags_open": airbags_open
        }
        
        # 4. Send to Consumer
        try:
            if data_queue.full():
                data_queue.get_nowait()
            data_queue.put_nowait(packet)
        except queue.Full:
            pass

        # 5. Enforce ~500ms loop
        elapsed = time.time() - loop_start_time
        sleep_time = max(0, 0.5 - elapsed)
        time.sleep(sleep_time)

    notifier.stop()
    bus.shutdown()
    print("[Reader] Polling stopped.")


# --- THREAD 2: Data Consumer ---
def keyboard_listener(command_queue, stop_event):
    """Simple thread to listen for user keyboard input from terminal."""
    while not stop_event.is_set():
        try:
            # This will block until the user types something and hits Enter.
            # We use a slight timeout or just accept that it blocks on stdin.
            user_input = input().strip().lower()
            if user_input == 'b':
                print("\n[Consumer] Manual BEEP triggered via keyboard (Enter)!")
                try:
                    command_queue.put_nowait("BEEP")
                except queue.Full:
                    pass
            elif user_input == 'e':
                print("\n[Consumer] Manual DTC Check triggered via keyboard (Enter)!")
                try:
                    command_queue.put_nowait("REQ_DTC")
                except queue.Full:
                    pass
        except EOFError:
            break
        except Exception:
            pass


def data_consumer_thread(data_queue, command_queue, response_queue, stop_event):
    """
    Reads decoded data from the queue and processes it.
    Can send commands back to the reader thread via the command_queue,
    and receive specific responses back via response_queue.
    Includes a keyboard listener to manually trigger actions.
    """
    print("[Consumer] Ready to receive data.")
    
    # Start the simple terminal keyboard listener in the background
    print("[Consumer] Keyboard listener active:")
    print("           Type 'b' and press ENTER to send a BEEP command.")
    print("           Type 'e' and press ENTER to request Engine Error Codes.")
    kb_thread = threading.Thread(target=keyboard_listener, args=(command_queue, stop_event), daemon=True)
    kb_thread.start()

    # Example: Fire off a request to the Reader Thread to get the VIN initially
    # Give the reader thread a slight moment to start up first
    time.sleep(1)
    print("\n[Consumer] Requesting VIN from the car...")
    command_queue.put("REQ_VIN")
    
    # Wait for the VIN response 
    try:
        response = response_queue.get(timeout=5.0)
        if response["type"] == "VIN_RESPONSE":
            vin = response["data"]
            print(f"\n======================================")
            print(f"[Consumer] RECEIVED VIN: {vin}")
            print(f"======================================\n")
        response_queue.task_done()
    except queue.Empty:
        print("\n[Consumer] [!] Timed out waiting for VIN response!")
    
    
    # Start the continuous data consumption loop
    while not stop_event.is_set():
        
        # Check if the Reader sent back any specific responses (like DTCs)
        try:
            resp = response_queue.get_nowait()
            if resp["type"] == "DTC_RESPONSE":
                print(f"\n======================================")
                print(f"[Consumer] ⚠ ENGINE CODES (DTCs) ⚠")
                for code in resp["data"]:
                    print(f"           -> {code}")
                print(f"======================================\n")
            response_queue.task_done()
        except queue.Empty:
            pass
            
            
        try:
            # Wait for data, timeout every second to check stop_event
            data = data_queue.get(timeout=1.0)
            
            # FORMATTED OUTPUT
            print("\n" + "="*40)
            print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] NEW CAR DATA")
            print("="*40)
            print(f" Speed       : {data['speed_kmh']} km/h")
            print(f" Fuel        : {data['fuel_percent']} %")
            print(f" Battery     : {data['battery_v']} V")
            print(f" Mileage     : {data['mileage_km']} km")
            print(f" Brake Pedal : {data['brake_level_percent']} %")
            
            # --- ACTION LOGIC & HIGHLIGHTS ---
            trigger_warning_beep = False
            
            if data['airbags_open']:
                print(f" AIRBAGS     : [!!!!] TRIGGERED [!!!!]")
                trigger_warning_beep = True
            else:
                print(f" AIRBAGS     : OK")
                
            if data['abs_activated']:
                print(f" ABS         : [!] ACTIVATED [!]")
                trigger_warning_beep = True
            else:
                print(f" ABS         : INACTIVE")
                
            print("="*40)
            
            # Send a command back to the reader thread to BEEP the car
            # if a safety event was detected!
            if trigger_warning_beep:
                try:
                    command_queue.put_nowait("BEEP")
                except queue.Full:
                    pass
            
            data_queue.task_done()
            
        except queue.Empty:
            continue
    
    # Cleanup listener if it was created
    try:
        listener.stop()
    except:
        pass

def main(interface='can0'):
    # Shared Queues for bi-directional communication
    data_queue = queue.Queue(maxsize=5)     # Data: Reader -> Consumer
    command_queue = queue.Queue(maxsize=5)  # Commands: Consumer -> Reader
    response_queue = queue.Queue(maxsize=5) # Specific Responses: Reader -> Consumer
    
    stop_event = threading.Event()

    # Create Threads
    reader = threading.Thread(target=can_reader_thread, args=(interface, data_queue, command_queue, response_queue, stop_event), daemon=True)
    consumer = threading.Thread(target=data_consumer_thread, args=(data_queue, command_queue, response_queue, stop_event), daemon=True)

    try:
        # Start Threads
        reader.start()
        consumer.start()

        # Main thread just waits until user presses Ctrl+C
        while reader.is_alive() and consumer.is_alive():
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nStopping threads...")
        stop_event.set()
        
    finally:
        reader.join(timeout=2)
        consumer.join(timeout=2)
        print("Shutdown complete.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Multithreaded OBD-II Live Monitor")
    parser.add_argument('-i', '--interface', default='can0', help='CAN interface to use (default: can0)')
    args = parser.parse_args()
    
    main(args.interface)



