import can
import time
import sys

# Standard OBD-II IDs
OBD_REQUEST_ID = 0x7DF
OBD_PHYSICAL_ID = 0x7E0
MODE_REQUEST_DTC = 0x03

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

def check_dtc():
    print("--- OBD-II DTC Scanner ---")
    try:
        bus = can.interface.Bus(channel='can0', bustype='socketcan')
    except OSError as e:
        print(f"Error opening can0: {e}. Is the interface up?")
        sys.exit(1)

    # 1. Send Mode 03 request
    request_data = [0x01, MODE_REQUEST_DTC, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    msg = can.Message(arbitration_id=OBD_REQUEST_ID, data=request_data, is_extended_id=False)
    
    print("Querying ECU for Diagnostic Trouble Codes...")
    try:
        bus.send(msg)
    except can.CanError as e:
        print(f"Failed to send request: {e}")
        sys.exit(1)

    # 2. Parse response
    dtcs = []
    timeout = time.time() + 3.0
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
            if len(data) >= 3 and data[1] == 0x43:
                num_dtcs = data[2]
                dtc_bytes.extend(data[3:3 + (num_dtcs * 2)])
                break
                
        elif pci == 1: # First frame multi-frame
            if data[2] == 0x43:
                num_dtcs = data[3]
                dtc_bytes.extend(data[4:8])
                # Send Flow Control to ECU physical address (usually 0x7E0 for engine)
                fc_msg = can.Message(arbitration_id=0x7E0, data=[0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], is_extended_id=False)
                bus.send(fc_msg)
                
        elif pci == 2: # Consecutive frame
            dtc_bytes.extend(data[1:])
            if len(dtc_bytes) >= 6: 
                break
                
    bus.shutdown()
                
    # Parse the bytes 2 at a time 
    for i in range(0, len(dtc_bytes) - 1, 2):
        code = decode_dtc(dtc_bytes[i], dtc_bytes[i+1])
        if code:
            dtcs.append(code)
            
    # Dedup and print
    unique_dtcs = list(set(dtcs))
    if unique_dtcs:
        print("\n=== ERRORS FOUND ===")
        for d in unique_dtcs:
            print(f" -> {d}")
        print("====================")
    else:
        print("\n[OK] No Engine Error Codes Found.")

if __name__ == "__main__":
    check_dtc()
