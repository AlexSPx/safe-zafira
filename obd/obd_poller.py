import can
import time
import threading
import logging

logger = logging.getLogger("telemetry_node")

# Configuration
CAN_INTERFACE = 'can0'
OBD_REQUEST_ID = 0x7DF
OBD_REPLY_ID = 0x7E8
POLL_INTERVAL = 0.5  # Seconds between OBD polls
TIMEOUT_CAN = 5.0    # Seconds before considering device removed

class OBDPoller(threading.Thread):
    def __init__(self):
        super().__init__()
        self.daemon = True
        self.running = True
        self.bus = None
        
        # State
        self.speed = 0
        self.rpm = 0
        self.engine_load = 0
        self.dtc_count = 0
        self.mil_on = False
        self.last_can_rx = 0
        
        # Crash detection state
        self.speed_history = []  # Tuples of (time, speed)
        
        # Driver attention state
        self.driving_start_time = None
        self.last_break_time = time.time()
        
        self.events = []  # List of event strings

    def connect(self):
        try:
            self.bus = can.interface.Bus(channel=CAN_INTERFACE, bustype='socketcan')
            logger.info(f"Connected to {CAN_INTERFACE}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect CAN bus: {e}")
            return False

    def request_pid(self, mode, pid):
        if not self.bus: return
        msg = can.Message(
            arbitration_id=OBD_REQUEST_ID,
            data=[0x02, mode, pid, 0x00, 0x00, 0x00, 0x00, 0x00],
            is_extended_id=False
        )
        try:
            self.bus.send(msg)
        except can.CanError:
            pass

    def run(self):
        while self.running and not self.connect():
            time.sleep(2)
            
        pids_to_poll = [(0x01, 0x0D), (0x01, 0x0C), (0x01, 0x04), (0x01, 0x01)]
        pid_idx = 0
        
        while self.running:
            # Send Request
            mode, pid = pids_to_poll[pid_idx]
            self.request_pid(mode, pid)
            pid_idx = (pid_idx + 1) % len(pids_to_poll)
            
            # Read Response (with timeout to not block forever)
            start_wait = time.time()
            while time.time() - start_wait < POLL_INTERVAL:
                msg = self.bus.recv(0.1)
                if msg and msg.arbitration_id == OBD_REPLY_ID:
                    self.last_can_rx = time.time()
                    data = msg.data
                    # Data length, Mode, PID
                    if len(data) >= 4 and data[1] == (mode + 0x40) and data[2] == pid:
                        self.handle_response(pid, data)
            
            self.check_anomalies()

    def handle_response(self, pid, data):
        if pid == 0x0D:  # Speed km/h
            self.speed = data[3]
            self.speed_history.append((time.time(), self.speed))
            
            # Keep only last 2 seconds
            now = time.time()
            self.speed_history = [(t, s) for t, s in self.speed_history if (now - t) <= 2.0]
            
            if self.speed > 0:
                if self.driving_start_time is None:
                    self.driving_start_time = time.time()
            else:
                if self.driving_start_time and (time.time() - self.driving_start_time) > 60:
                    # Vehicle stopped for a while, could be a break
                    self.driving_start_time = None
                    self.last_break_time = time.time()
                    
        elif pid == 0x0C:  # RPM
            self.rpm = ((data[3] * 256) + data[4]) / 4.0
        elif pid == 0x04:  # Engine Load %
            self.engine_load = (data[3] / 255.0) * 100.0
        elif pid == 0x01:  # Status since DTCs cleared
            A = data[3]
            self.mil_on = (A & 0x80) != 0
            self.dtc_count = A & 0x7F

    def check_anomalies(self):
        now = time.time()
        
        # 1. Device Removal Detection
        if self.last_can_rx > 0 and (now - self.last_can_rx) > TIMEOUT_CAN:
            self.log_event("DEVICE_REMOVED")
            
        # 2. Crash Detection (Speed drop > 20km/h in < 1 second)
        if len(self.speed_history) >= 2:
            old_t, old_s = self.speed_history[0]
            new_t, new_s = self.speed_history[-1]
            if (new_t - old_t) > 0:
                drop = old_s - new_s
                dt = new_t - old_t
                if drop > 20 and dt <= 1.5:  # High G
                    self.log_event("CRASH_DETECTED")
                    self.speed_history.clear() # Prevent multiple triggers
                    
        # 3. Driver Attention / Fatigue
        if self.driving_start_time:
            drive_duration = now - self.driving_start_time
            if drive_duration > 2 * 3600: # 2 hours
                self.log_event("DRIVER_FATIGUE_WARNING")
                
    def log_event(self, event_type):
        if event_type not in self.events:
            self.events.append(event_type)
            logger.warning(f"Event detected: {event_type}")

    def pop_events(self):
        e = self.events.copy()
        self.events.clear()
        return e
