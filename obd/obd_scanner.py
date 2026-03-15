import can
import time
import threading
import queue
import json
import os
import logging
from datetime import datetime

# --- Logging Setup ---
os.makedirs("logs", exist_ok=True)
log_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

# Main application logger
logger = logging.getLogger("obd_scanner")
logger.setLevel(logging.DEBUG)
_console = logging.StreamHandler()
_console.setLevel(logging.INFO)
_console.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(message)s', datefmt='%H:%M:%S'))
logger.addHandler(_console)

# Raw CAN frame logger (every frame sent/received)
raw_logger = logging.getLogger("obd_scanner.raw")
raw_logger.setLevel(logging.DEBUG)
_raw_fh = logging.FileHandler(f"logs/can_raw_{log_timestamp}.log")
_raw_fh.setFormatter(logging.Formatter('%(asctime)s.%(msecs)03d %(message)s', datefmt='%H:%M:%S'))
raw_logger.addHandler(_raw_fh)
raw_logger.propagate = False

# Parsed data logger (decoded values)
parsed_logger = logging.getLogger("obd_scanner.parsed")
parsed_logger.setLevel(logging.DEBUG)
_parsed_fh = logging.FileHandler(f"logs/can_parsed_{log_timestamp}.log")
_parsed_fh.setFormatter(logging.Formatter('%(asctime)s.%(msecs)03d %(message)s', datefmt='%H:%M:%S'))
parsed_logger.addHandler(_parsed_fh)
parsed_logger.propagate = False

# Standard OBD-II Request and Response IDs for CAN (11-bit)
OBD_REQUEST_ID = 0x7DF       # Broadcast request (all ECUs listen)
OBD_PHYSICAL_ID = 0x7E0       # Physical request ID for ECM (used for Flow Control)
OBD_RESPONSE_BASE = 0x7E8     # Engine ECU usually responds here

# Toyota proprietary request/response IDs (instrument cluster / body ECU)
TOYOTA_PROP_REQUEST_ID = 0x7C0
TOYOTA_PROP_RESPONSE_ID = 0x7C8

# Modes
MODE_CURRENT_DATA = 0x01
MODE_REQUEST_DTC = 0x03
MODE_VEHICLE_INFO = 0x09
TOYOTA_MODE_ENHANCED = 0x21   # Toyota proprietary enhanced diagnostic mode

# Mode 01 PIDs
PID_VEHICLE_SPEED = 0x0D
PID_FUEL_LEVEL = 0x2F
PID_CONTROL_MODULE_VOLTAGE = 0x42

# Toyota Enhanced PIDs (Service 0x21)
TOYOTA_PID_ODO_FUEL = 0x29    # Odometer + fuel data via instrument cluster

# Mode 09 PIDs
PID_VIN = 0x02


CONFIG_FILE = "car_config.json"
FUEL_TANK_CAPACITY = 42.0  # 2007 Toyota Yaris fuel tank capacity in liters

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

        self.passive_speed = None
        self.passive_mileage = None
        self.passive_rpm = None
        self.passive_steering_angle = None

    def on_message_received(self, msg):
        # Log every passive frame we care about
        if msg.arbitration_id in (self.brake_id, self.abs_id, self.airbags_id):
            raw_logger.debug(f"PASSIVE RX  ID=0x{msg.arbitration_id:03X} DATA={msg.data.hex(' ')}")

        # 1. Check for passive Brake Pedal Data
        if msg.arbitration_id == self.brake_id:
            idx = self.brake_cfg.get("byte_index", 0)
            if len(msg.data) > idx:
                # The byte is a bitmask (e.g. 0x10 or 0x20) when pressed, 0 when released
                is_pressed = msg.data[idx] > 0
                self.brake_level = 100.0 if is_pressed else 0.0
                parsed_logger.debug(f"BRAKE byte[{idx}]=0x{msg.data[idx]:02X} -> {self.brake_level:.1f}%")
                
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

        # 4. Check for passive Speed (Toyota common 0x0B4, bytes 5-6)
        if msg.arbitration_id == 0x0B4:
            if len(msg.data) >= 7:
                # Speed is big-endian, scale by 0.01 to get KPH
                self.passive_speed = ((msg.data[5] << 8) | msg.data[6]) * 0.01

        # 5. Check for passive Engine RPM (Toyota common 0x2C4, bytes 0-1)
        if msg.arbitration_id == 0x2C4:
            if len(msg.data) >= 2:
                # RPM is big-endian, directly mapped (e.g. 0x0364 = 868 RPM)
                self.passive_rpm = (msg.data[0] << 8) | msg.data[1]

        # 6. Check for passive Steering Angle (Toyota common 0x260, bytes 5-6)
        if msg.arbitration_id == 0x260:
            if len(msg.data) >= 7:
                # Signed 16-bit integer, standard 1.5 degree scaling
                val = (msg.data[5] << 8) | msg.data[6]
                if val > 32767:
                    val -= 65536
                self.passive_steering_angle = val * 1.5

        # 7. Check for passive Mileage (Toyota ODO on 0x611, bytes 5-7)
        if msg.arbitration_id == 0x611:
            if len(msg.data) >= 8:
                # Mileage in km is a 24-bit integer
                self.passive_mileage = (msg.data[5] << 16) | (msg.data[6] << 8) | msg.data[7]


def send_obd_request(bus, mode, pid=None, arb_id=None):
    """Sends an OBD-II request over CAN. PID is optional for some modes like 03.
    arb_id can be overridden for Toyota proprietary requests (e.g. 0x7C0).
    """
    target_id = arb_id if arb_id else OBD_REQUEST_ID
    if pid is not None:
        data = [0x02, mode, pid, 0x00, 0x00, 0x00, 0x00, 0x00]
    else:
        data = [0x01, mode, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
        
    msg = can.Message(arbitration_id=target_id, data=data, is_extended_id=False)
    raw_logger.debug(f"TX  ID=0x{target_id:03X} DATA={bytes(data).hex(' ')}")
    try:
        bus.send(msg)
    except can.CanError as e:
        logger.error(f"CAN send error: {e}")


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
        
        raw_logger.debug(f"DTC RX  ID=0x{msg.arbitration_id:03X} DATA={data.hex(' ')}")
        pci = data[0] >> 4
        
        # Mode 3 response is Mode + 0x40 = 0x43
        if pci == 0:  # Single frame
            if len(data) >= 3 and data[1] == 0x43:
                num_dtcs = data[2]
                dtc_bytes.extend(data[3:3 + (num_dtcs * 2)])
                break
                
        elif pci == 1: # First frame multi-frame
            if data[2] == 0x43:
                num_dtcs = data[3]
                dtc_bytes.extend(data[4:8])
                # Send Flow Control to ECU physical address, NOT broadcast
                fc_msg = can.Message(arbitration_id=OBD_PHYSICAL_ID, data=[0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], is_extended_id=False)
                raw_logger.debug(f"DTC FC TX  ID=0x{OBD_PHYSICAL_ID:03X} DATA={bytes(fc_msg.data).hex(' ')}")
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
    
    parsed_logger.info(f"DTCs decoded: {dtcs if dtcs else 'No Errors Found'}")
    return list(set(dtcs)) if dtcs else ["No Errors Found"]


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
        for _ in range(3):
            bus.send(beep_msg)
            time.sleep(0.1)
            
    except Exception as e:
        print(f"[CAN Writer] Failed to send beep command: {e}")


def request_and_read(bus, mode, pid, parser_func, arb_id=None, resp_id_range=None,
                     timeout_s=0.3):
    """Sends a request, waits for a response, and parses it.
    arb_id: override CAN ID for request (e.g. 0x7C0 for Toyota proprietary).
    resp_id_range: tuple (min, max) for expected response IDs.
    timeout_s: max seconds to wait for a response (default 0.3s).
    """
    send_obd_request(bus, mode, pid, arb_id=arb_id)
    
    resp_min, resp_max = resp_id_range if resp_id_range else (0x7E8, 0x7EF)
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        msg = bus.recv(0.05)
        if msg and resp_min <= msg.arbitration_id <= resp_max:
            raw_logger.debug(f"PID RX  ID=0x{msg.arbitration_id:03X} DATA={msg.data.hex(' ')} (expecting mode=0x{mode:02X} pid=0x{pid:02X})")
            result = parser_func(msg.data)
            if result is not None:
                parsed_logger.debug(f"PID 0x{pid:02X} parsed -> {result}")
                return result
    parsed_logger.debug(f"PID 0x{pid:02X} (mode 0x{mode:02X}) -> no response (timeout {timeout_s}s)")
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

def parse_toyota_odo_fuel(data):
    """Parse Toyota proprietary Service 0x21, PID 0x29 response.
    Response format on 0x7C8: [len] [0x61] [0x29] [ODO_H] [ODO_M] [ODO_L] [FUEL] ...
    - ODO: 3-byte big-endian odometer in km
    - FUEL: 1 byte, fuel level in 0.5-liter increments
    Returns dict {"odo_km": int, "fuel_liters": float} or None.
    """
    offset = find_data_offset(data, TOYOTA_MODE_ENHANCED, TOYOTA_PID_ODO_FUEL)
    if offset is None:
        return None

    result = {}

    # Odometer: 3 bytes at offset
    if offset + 2 < len(data):
        odo_km = (data[offset] << 16) | (data[offset+1] << 8) | data[offset+2]
        result["odo_km"] = odo_km
        parsed_logger.debug(f"Toyota ODO: {data[offset]:02X} {data[offset+1]:02X} {data[offset+2]:02X} -> {odo_km} km")

    # Fuel: 1 byte at offset+3 (0.5L increments)
    if offset + 3 < len(data):
        fuel_byte = data[offset + 3]
        fuel_liters = fuel_byte * 0.5
        result["fuel_liters"] = fuel_liters
        parsed_logger.debug(f"Toyota FUEL: 0x{fuel_byte:02X} -> {fuel_liters} L")

    return result if result else None


# --- THREAD 1: CAN Data Producer & Command Executor ---
def can_reader_thread(interface, data_queue, command_queue, response_queue, stop_event):
    """
    Continuously polls the CAN bus for live data and calculates physics-based events.
    Uses staggered polling: speed every 250ms, voltage/odo+fuel alternating.
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

    loop_counter = 0

    # Cached values persisted across loop iterations (updated on alternating loops)
    last_voltage      = 13.5
    last_voltage_time = 0
    last_mileage      = None
    last_fuel_liters  = None
    
    print("[Reader] Polling started.")
    
    while not stop_event.is_set():
        loop_start_time = time.time()
        
        # 0. Check for commands from the Consumer Thread (like BEEP, REQ_DTC)
        try:
            command = command_queue.get_nowait()
            if command == "BEEP":
                trigger_beep(bus, config)
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
        
        # ── 1. OBD POLLING & PASSIVE DATA ──────────────────────────────────────
        # Speed and Mileage are now read passively from the listener — instant!
        current_speed = listener.passive_speed
        last_mileage  = listener.passive_mileage
        
        # Only poll voltage every 10 seconds.
        # Continuous OBD requests on 2007 Yaris can cause ECU lag/low RPM.
        if time.time() - last_voltage_time > 10.0:
            voltage = request_and_read(
                bus, MODE_CURRENT_DATA, PID_CONTROL_MODULE_VOLTAGE, parse_voltage, timeout_s=0.3
            )
            if voltage is not None:
                last_voltage = voltage
            last_voltage_time = time.time()

        # Brake level from passive CAN listener (no polling needed)
        brake_level = listener.brake_level

        # ── 2. SAFETY FLAGS FROM PASSIVE CAN ─────────────────────────────
        abs_activated = listener.abs_activated
        airbags_open = listener.airbags_open

        # ── 3. CREATE DATA PACKET ────────────────────────────────────────
        # Fuel: Temporary hardcode to 25% (2/8 bars) until exact passive CAN ID is sniffed
        fuel_percent = 25.0

        packet = {
            "timestamp": datetime.now().isoformat(),
            "speed_kmh": round(current_speed, 1) if current_speed is not None else -1,
            "rpm": listener.passive_rpm if listener.passive_rpm is not None else -1,
            "steering_angle": round(listener.passive_steering_angle, 1) if listener.passive_steering_angle is not None else 0.0,
            "fuel_percent": fuel_percent if fuel_percent is not None else -1,
            "battery_v": round(last_voltage, 2) if last_voltage is not None else -1,
            "mileage_km": round(last_mileage, 1) if last_mileage is not None else -1,
            "brake_level_percent": round(brake_level, 1),
            "abs_activated": abs_activated,
            "airbags_open": airbags_open
        }
        
        parsed_logger.info(json.dumps(packet))
        
        # ── 4. SEND TO CONSUMER ──────────────────────────────────────────
        try:
            data_queue.put_nowait(packet)
        except queue.Full:
            try:
                data_queue.get_nowait()  # discard oldest
                data_queue.put_nowait(packet)
            except queue.Empty:
                pass

        loop_counter += 1

        # ── 5. ENFORCE ~250ms LOOP ───────────────────────────────────────
        elapsed = time.time() - loop_start_time
        sleep_time = max(0, 0.25 - elapsed)
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

    time.sleep(1)
    print("\n[Consumer] Startup complete. Waiting for commands/data...")
    
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
            print(f" RPM         : {data['rpm']}")
            print(f" Steering    : {data['steering_angle']} deg")
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
    
    # kb_thread is a daemon thread so it will exit automatically when main exits

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



