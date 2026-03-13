import time
import json
import threading
import socket
import logging
import requests
from math import radians, cos, sin, asin, sqrt

from obd_poller import OBDPoller

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("telemetry_node")

# Configuration
SERVER_URL = "http://localhost:8080/api/telemetry" # Replace with actual server URL
SYNC_INTERVAL = 5.0  # Seconds between server syncs

class GPSPoller(threading.Thread):
    def __init__(self):
        super().__init__()
        self.daemon = True
        self.running = True
        self.lat = None
        self.lon = None
        self.speed_limit = None
        self.last_overpass_query = 0
        
    def haversine(self, lat1, lon1, lat2, lon2):
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlon = lon2 - lon1 
        dlat = lat2 - lat1 
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a)) 
        r = 6371 # km
        return c * r

    def get_speed_limit(self, lat, lon):
        now = time.time()
        if now - self.last_overpass_query < 30: # Limit API calls
            return
        self.last_overpass_query = now
        
        query = f"""
        [out:json];
        way(around:50,{lat},{lon})["maxspeed"];
        out qt;
        """
        try:
            r = requests.get("https://overpass-api.de/api/interpreter", params={"data": query}, timeout=5)
            if r.status_code == 200:
                d = r.json()
                for el in d.get("elements", []):
                    if "tags" in el and "maxspeed" in el["tags"]:
                        limit = el["tags"]["maxspeed"]
                        # Handle simple numbers
                        if limit.isdigit():
                            self.speed_limit = int(limit)
                            logger.info(f"Updated speed limit: {self.speed_limit}")
                            return
        except Exception as e:
            logger.error(f"Overpass API error: {e}")

    def run(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect(('127.0.0.1', 2947))
            sock.sendall(b'?WATCH={"enable":true,"json":true}\n')
            
            f = sock.makefile('r')
            while self.running:
                line = f.readline()
                if not line:
                    break
                try:
                    data = json.loads(line)
                    if data.get('class') == 'TPV':
                        new_lat = data.get('lat')
                        new_lon = data.get('lon')
                        if new_lat is not None and new_lon is not None:
                            # Update limit if moved > 500m
                            if self.lat is None or self.haversine(self.lat, self.lon, new_lat, new_lon) > 0.5:
                                threading.Thread(target=self.get_speed_limit, args=(new_lat, new_lon)).start()
                            
                            self.lat = new_lat
                            self.lon = new_lon
                except json.JSONDecodeError:
                    pass
        except Exception as e:
            logger.error(f"GPS polling failed: {e}")

def main():
    obd = OBDPoller()
    # gps = GPSPoller()
    
    obd.start()
    # gps.start()
    
    try:
        while True:
            time.sleep(SYNC_INTERVAL)
            
            payload = {
                "timestamp": time.time(),
                "telemetry": {
                    "speed": obd.speed,
                    "rpm": obd.rpm,
                    "engine_load": obd.engine_load,
                    "mil_on": obd.mil_on,
                    "dtc_count": obd.dtc_count,
                    # "speed_limit": gps.speed_limit,
                    # "lat": gps.lat,
                    # "lon": gps.lon
                },
                "events": obd.pop_events()
            }
            
            logger.info(f"Syncing payload: {payload}")
            try:
                requests.post(SERVER_URL, json=payload, timeout=2)
            except Exception as e:
                logger.error(f"Server sync failed: {e}")
                
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        obd.running = False
        # gps.running = False
        obd.join()
        # gps.join()

if __name__ == "__main__":
    main()
