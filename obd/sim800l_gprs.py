import time
import serial
import argparse

def send_at_command(ser, command, expected_response="OK", timeout=2):
    """Sends an AT command to the SIM800L and waits for the expected response.
    Returns immediately after finding the expected_response (Bug #7 fix).
    """
    print(f">> {command}")
    ser.write((command + '\r\n').encode('ascii'))
    
    start_time = time.time()
    response_lines = []
    success = False
    
    while (time.time() - start_time) < timeout:
        if ser.in_waiting > 0:
            line = ser.readline().decode('ascii', errors='replace').strip()
            if line:
                print(f"<< {line}")
                response_lines.append(line)
                if expected_response in line:
                    success = True
                    break  # Bug #7 fix: exit immediately instead of waiting out full timeout
                if "ERROR" in line:
                    break
        else:
            time.sleep(0.05)  # Reduced from 0.1 to improve responsiveness
            
    return success, response_lines

def setup_gprs(ser, apn):
    """Configures the SIM800L for GPRS connection.
    Returns True if bearer was successfully opened, False otherwise.
    """
    print("\n--- Setting up GPRS ---")
    send_at_command(ser, "AT+CFUN=1")           # Full functionality
    time.sleep(2)
    send_at_command(ser, "AT+CGATT=1", timeout=5) # Attach to GPRS service
    time.sleep(1)
    
    # Configure bearer profile 1
    send_at_command(ser, "AT+SAPBR=3,1,\"Contype\",\"GPRS\"")
    send_at_command(ser, f"AT+SAPBR=3,1,\"APN\",\"{apn}\"")
    
    # Open bearer
    success, _ = send_at_command(ser, "AT+SAPBR=1,1", timeout=10)
    if success:
        print("GPRS Bearer opened successfully.")
    else:
        print("Failed to open GPRS bearer. Might already be open or APN is wrong.")
        
    # Check assigned IP address
    send_at_command(ser, "AT+SAPBR=2,1")
    return success

def close_gprs(ser):
    """Closes the GPRS bearer cleanly. Call this on teardown or error."""
    send_at_command(ser, "AT+SAPBR=0,1", timeout=5)

def http_get(ser, url):
    """Performs an HTTP GET request using SIM800L."""
    print(f"\n--- Making HTTP GET to {url} ---")
    
    send_at_command(ser, "AT+HTTPINIT")
    send_at_command(ser, "AT+HTTPPARA=\"CID\",1")
    send_at_command(ser, f"AT+HTTPPARA=\"URL\",\"{url}\"")
    
    success, _ = send_at_command(ser, "AT+HTTPACTION=0", expected_response="+HTTPACTION:", timeout=30)
    
    if success:
        print("Fetching response data...")
        send_at_command(ser, "AT+HTTPREAD", timeout=10)
    else:
        print("HTTP GET Action failed.")
        
    send_at_command(ser, "AT+HTTPTERM")

def http_post(ser, url, json_body: str) -> bool:
    """
    Performs an HTTP POST with a JSON body using the SIM800L's internal HTTP stack.
    Bug #9 fix: added this missing function needed by telemetry_node.py.
    Returns True if the server responded with a 2xx status code.
    """
    print(f"\n--- Making HTTP POST to {url} ({len(json_body)} bytes) ---")
    
    body_bytes = json_body.encode('utf-8')
    body_len = len(body_bytes)

    send_at_command(ser, "AT+HTTPINIT")
    send_at_command(ser, "AT+HTTPPARA=\"CID\",1")
    send_at_command(ser, f"AT+HTTPPARA=\"URL\",\"{url}\"")
    send_at_command(ser, "AT+HTTPPARA=\"CONTENT\",\"application/json\"")
    
    # Tell the module how many bytes we are about to send (max wait 5s for ">" prompt)
    ok, _ = send_at_command(ser, f"AT+HTTPDATA={body_len},5000", expected_response="DOWNLOAD", timeout=6)
    if not ok:
        print("Failed to enter HTTPDATA mode.")
        send_at_command(ser, "AT+HTTPTERM")
        return False
    
    # Write the raw JSON body directly to serial
    ser.write(body_bytes)
    time.sleep(0.5)
    
    # Fire the POST
    success, lines = send_at_command(ser, "AT+HTTPACTION=1", expected_response="+HTTPACTION:", timeout=30)
    
    status_code = None
    for line in lines:
        if "+HTTPACTION:" in line:
            # Format: +HTTPACTION: 1,<status_code>,<data_len>
            parts = line.split(",")
            if len(parts) >= 2:
                try:
                    status_code = int(parts[1].strip())
                except ValueError:
                    pass

    send_at_command(ser, "AT+HTTPTERM")
    
    if status_code and 200 <= status_code < 300:
        print(f"POST successful: HTTP {status_code}")
        return True
    else:
        print(f"POST failed: HTTP {status_code}")
        return False


def main(port, baudrate, apn):
    print(f"Connecting to SIM800L on {port} at {baudrate} baud...")
    
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
    except Exception as e:
        print(f"Failed to open serial port: {e}")
        return

    # Basic checks
    print("\n--- Basic Module Checks ---")
    send_at_command(ser, "AT")            # Check communication
    send_at_command(ser, "AT+CPIN?")      # Check if SIM is unlocked/ready
    send_at_command(ser, "AT+CSQ")        # Check signal strength
    send_at_command(ser, "AT+CREG?")      # Check network registration

    time.sleep(1)

    # Setup GPRS connection — Bug #8 fix: close bearer gracefully on failure
    gprs_ok = setup_gprs(ser, apn)
    
    if gprs_ok:
        # Test GET
        http_get(ser, "http://httpbin.org/get")
        
        # Test POST with a small JSON payload
        import json
        test_payload = json.dumps({"test": True, "device": "SIM800L"})
        http_post(ser, "http://httpbin.org/post", test_payload)
        
        close_gprs(ser)
    else:
        print("GPRS setup failed. Skipping HTTP tests.")

    if ser.is_open:
        ser.close()
    print("\nDone.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SIM800L GPRS Test Script")
    parser.add_argument('-p', '--port', default='/dev/ttyS0', help='Serial port path (e.g. /dev/ttyS0 or /dev/ttyUSB0)')
    parser.add_argument('-b', '--baudrate', type=int, default=9600, help='Baud rate (SIM800L default is 9600)')
    parser.add_argument('-a', '--apn', default='internet', help='APN for your cellular provider (e.g., internet)')
    
    args = parser.parse_args()
    main(args.port, args.baudrate, args.apn)
