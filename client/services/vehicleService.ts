import { getAuthStore } from '../stores/authStore';

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
  location: LocationData | null;
  diagnostics: string[];
  mileage: number | null;
  rpm: number | null;
  steering: number | null;
  batteryCar: number | null;
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
  lastLocation: LocationData | null;
  allDangers: string[];
  allDiagnostics: string[];
  dataPoints: number;
};

export type VehicleInitiationRequest = {
  vehicleId: string;
  model: string;
  make: string;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://server.g8row.xyz';

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class VehicleApiService {
  constructor(private readonly baseUrl: string = API_BASE_URL) {}

  private buildUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private getAuthHeaders(): Record<string, string> {
    const { jwt } = getAuthStore();
    if (!jwt) {
      throw new ApiError(401, 'Not authenticated');
    }
    return {
      Authorization: `Bearer ${jwt}`,
    };
  }

  private async request<TResponse>(
    path: string,
    init: RequestInit,
  ): Promise<TResponse> {
    const response = await fetch(this.buildUrl(path), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...this.getAuthHeaders(),
        ...(init.headers ?? {}),
      },
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Ignore JSON parsing errors for empty/non-JSON responses.
    }

    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof payload.message === 'string'
          ? payload.message
          : `Request failed with status ${response.status}`;

      throw new ApiError(response.status, message);
    }

    return payload as TResponse;
  }

  private get<TResponse>(
    path: string,
    headers?: Record<string, string>,
  ): Promise<TResponse> {
    return this.request<TResponse>(path, {
      method: 'GET',
      headers,
    });
  }

  private post<TResponse>(
    path: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<TResponse> {
    return this.request<TResponse>(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  getVehicles(): Promise<Vehicle[]> {
    return this.get<Vehicle[]>('/api/vehicles');
  }

  getVehicleData(device: string): Promise<VehicleDataClient | null> {
    const query = new URLSearchParams({ device }).toString();
    return this.get<VehicleDataClient | null>(`/api/vehicles/data?${query}`);
  }

  getVehicleStatistics(minutes: number = 120): Promise<VehicleStatusSummary[]> {
    return this.get<VehicleStatusSummary[]>(
      `/api/vehicles/statistics?minutes=${minutes}`,
    );
  }

  getSpeedLimit(device: string): Promise<number | null> {
    const query = new URLSearchParams({ device }).toString();
    return this.get<number | null>(`/api/vehicles/speed-limit?${query}`);
  }

  registerVehicle(request: VehicleInitiationRequest): Promise<void> {
    return this.post<void>(
      '/api/vehicles',
      request as unknown as Record<string, unknown>,
    );
  }

  getVehiclesForFamilyMember(memberId: number): Promise<Vehicle[]> {
    return this.get<Vehicle[]>(`/api/vehicles/family/${memberId}`);
  }
}

export const vehicleService = new VehicleApiService();

export { ApiError };
