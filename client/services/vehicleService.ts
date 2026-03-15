import { apiClient } from './apiClient';
export { ApiError } from './apiClient';

export type LocationData = {
  x: number;
  y: number;
};

export type Dangers =
  | 'CRASH_DETECTED'
  | 'HARD_BRAKING'
  | 'DRIVER_FATIGUE'
  | 'AIRBAGS_DEPLOYED'
  | 'ABS_ACTIVATED'
  | 'LOW_BATTERY'
  | 'DRIVER_NOT_AWARE';

export type Vehicle = {
  id: number;
  vehicleNo: string;
  vin: string;
  make: string;
  model: string;
};

export type VehicleDataClient = {
  speed: number | null;
  battery: number | null;
  location: LocationData | null;
  diagnostics: string[];
  mileage: number | null;
  rpm: number | null;
  steering: number | null;
  dangers: Dangers[];
  airbags: boolean | null;
  abs: boolean | null;
  brakePedal: boolean | null;
  speedLimit: number | null;
};

export type VehicleStatusSummary = {
  vehicleNo: string;
  avgSpeed: number | null;
  maxSpeed: number | null;
  avgBattery: number | null;
  avgBatteryCar: number | null;
  avgFuel: number | null;
  avgRpm: number | null;
  lastLocation: LocationData | null;
};

export type VehicleInitiationRequest = {
  vehicleId: string;
  model: string;
  make: string;
};

class VehicleApiService {
  getVehicles(): Promise<Vehicle[]> {
    return apiClient.get<Vehicle[]>('/api/vehicles');
  }

  getVehicleData(vehicleId: string): Promise<VehicleDataClient | null> {
    const query = new URLSearchParams({
      vehicleId,
      device: vehicleId,
    }).toString();
    return apiClient.get<VehicleDataClient | null>(
      `/api/vehicles/data?${query}`,
    );
  }

  getVehicleStatistics(minutes: number = 120): Promise<VehicleStatusSummary[]> {
    return apiClient.get<VehicleStatusSummary[]>(
      `/api/vehicles/statistics?minutes=${minutes}`,
    );
  }

  getSpeedLimit(vehicleId: string): Promise<number | null> {
    const query = new URLSearchParams({
      vehicleId,
      device: vehicleId,
    }).toString();
    return apiClient.get<number | null>(`/api/vehicles/speed-limit?${query}`);
  }

  registerVehicle(request: VehicleInitiationRequest): Promise<void> {
    return apiClient.post<void>('/api/vehicles', request);
  }

  getVehiclesForFamilyMember(memberId: number): Promise<Vehicle[]> {
    return apiClient.get<Vehicle[]>(`/api/vehicles/family/${memberId}`);
  }
}

export const vehicleService = new VehicleApiService();
