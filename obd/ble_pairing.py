import logging
import asyncio
import uuid
import json
import os

logger = logging.getLogger("telemetry_node")

# Standardized UUIDs so the mobile app always knows what to scan for.
SERVICE_UUID = "00001523-1212-efde-1523-785feabcd123"
CHAR_READ_UUID = "00001524-1212-efde-1523-785feabcd123"  # App reads this to get the Hardware ID
CHAR_WRITE_UUID = "00001525-1212-efde-1523-785feabcd123" # App writes "OK" here to confirm cloud registration

CONFIG_FILE = "device_config.json"

def get_device_id():
    """Attempt to get RPi hardware serial, fallback to MAC address."""
    try:
        with open('/proc/cpuinfo', 'r') as f:
            for line in f:
                if line.startswith('Serial'):
                    return line.split(':')[1].strip()
    except Exception:
        pass
    return str(uuid.getnode())

def is_device_paired():
    """Check if the persistent config file indicates the device is already paired."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                return config.get('paired', False)
        except Exception as e:
            logger.error(f"Error reading config file: {e}")
            return False
    return False

def mark_device_paired(jwt_token: str = ""):
    """Persist the paired state and JWT token to disk."""
    config = {
        'paired': True,
        'device_id': get_device_id(),
        'jwt_token': jwt_token,
    }
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f)
        logger.info(f"Saved pairing config to {CONFIG_FILE}. JWT stored. Future boots will skip BLE.")
    except Exception as e:
        logger.error(f"Error saving config file: {e}")


def load_device_config() -> dict:
    """Load persistent device config (jwt_token, device_id, paired flag)."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {}


class BLEPairingServer:
    def __init__(self):
        self.paired_event = asyncio.Event()
        self.hardware_id = get_device_id()
        # Create a shorter, recognizable name for the Bluetooth scanner
        self.device_name = f"Zafira-{self.hardware_id[-4:].upper()}"

    def read_request(self, characteristic, **kwargs) -> bytearray:
        logger.info(f"App requested Hardware ID: {self.hardware_id}")
        return self.hardware_id.encode("utf-8")

    def write_request(self, characteristic, value: bytearray, **kwargs):
        """
        The app writes the JWT Bearer token here after cloud registration.
        Format: a raw JWT string (e.g. 'eyJhbGci...')
        """
        decoded = ""
        try:
            decoded = value.decode("utf-8").strip()
            logger.info(f"Received BLE JWT token (length={len(decoded)})")
        except Exception:
            logger.warning(f"Failed decoding BLE payload: {value}")
            return

        # Accept any non-empty string as the token (it will be validated by the server)
        if decoded:
            logger.info("JWT token received — marking device as paired.")
            mark_device_paired(jwt_token=decoded)
            self.paired_event.set()
        else:
            logger.warning("Received empty BLE payload, ignoring.")

    async def start_server(self):
        if is_device_paired():
            logger.info("Device is already paired. Skipping BLE broadcast.")
            return True

        try:
            from bless import (
                BlessServer,
                BlessGATTCharacteristic,
                GATTCharacteristicProperties,
                GATTAttributePermissions
            )
        except ImportError:
            logger.error("\n*** BLESS MODULE MISSING ***")
            logger.error("Please run: pip install bless")
            logger.error("Mocking BLE pairing process for 5 seconds...")
            await asyncio.sleep(5)
            logger.info("Mock BLE pairing successful. Continuing boot...")
            mark_device_paired()
            return True

        loop = asyncio.get_event_loop()
        server = BlessServer(name=self.device_name, loop=loop)
        
        server.read_request_func = self.read_request
        server.write_request_func = self.write_request

        try:
            await server.add_new_service(SERVICE_UUID)
            
            # Read Characteristic (App gets Hardware ID)
            await server.add_new_characteristic(
                SERVICE_UUID,
                CHAR_READ_UUID,
                (GATTCharacteristicProperties.read | GATTCharacteristicProperties.notify),
                None,
                GATTAttributePermissions.readable,
            )
            
            # Write Characteristic (App confirms registration)
            await server.add_new_characteristic(
                SERVICE_UUID,
                CHAR_WRITE_UUID,
                GATTCharacteristicProperties.write,
                None,
                GATTAttributePermissions.writeable,
            )

            logger.info(f"Starting BLE Server: [{self.device_name}]")
            logger.info(f"[!] Scan for Service UUID: {SERVICE_UUID}")
            logger.info(f"[!] Read Hardware ID from: {CHAR_READ_UUID}")
            logger.info(f"[!] Write 'OK' to finish at: {CHAR_WRITE_UUID}")
            
            await server.start()
            
            logger.info("BLE broadcasting... Waiting for Mobile App to complete registration via Cloud.")
            await self.paired_event.wait()
            
            logger.info("Pairing complete! Shutting down BLE server...")
            await server.stop()
            return True
            
        except Exception as e:
            logger.error(f"BLE Server exception: {e}")
            return False

def run_ble_pairing():
    server = BLEPairingServer()
    asyncio.run(server.start_server())

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    run_ble_pairing()
