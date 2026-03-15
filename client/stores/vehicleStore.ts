import { create } from 'zustand';
import type {
  Vehicle,
  VehicleDataClient,
  VehicleStatusSummary,
} from '../services/vehicleService';
import { vehicleService } from '../services/vehicleService';

type VehicleState = {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  vehicleData: VehicleDataClient | null;
  statistics: VehicleStatusSummary[];
  isLoading: boolean;
  error: string | null;
};
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let pollingRequestInFlight = false;

export const useVehicleStore = create<VehicleState>(() => ({
  vehicles: [],
  selectedVehicle: null,
  vehicleData: null,
  statistics: [],
  isLoading: false,
  error: null,
}));

function mergeVehicleDataKeepingPreviousOnNull(
  previous: VehicleDataClient | null,
  incoming: VehicleDataClient | null,
): VehicleDataClient | null {
  if (!incoming) return previous;
  if (!previous) return incoming;

  const merged = { ...incoming } as VehicleDataClient;

  (Object.keys(incoming) as Array<keyof VehicleDataClient>).forEach((key) => {
    if (incoming[key] === null) {
      (merged as Record<string, unknown>)[key] = previous[key];
    }
  });

  return merged;
}

async function pollSelectedVehicleData() {
  const { selectedVehicle } = useVehicleStore.getState();
  if (!selectedVehicle?.vehicleNo || pollingRequestInFlight) return;

  pollingRequestInFlight = true;
  try {
    const data = await vehicleService.getVehicleData(selectedVehicle.vehicleNo);
    setVehicleData(data);
  } catch (error) {
    useVehicleStore.setState({
      error:
        error instanceof Error ? error.message : 'Failed to fetch vehicle data',
    });
  } finally {
    pollingRequestInFlight = false;
  }
}

export function setVehicles(vehicles: Vehicle[]) {
  const currentSelectedVehicle = useVehicleStore.getState().selectedVehicle;
  useVehicleStore.setState({
    vehicles,
    selectedVehicle:
      vehicles.length > 0 && !currentSelectedVehicle
        ? vehicles[0]
        : currentSelectedVehicle,
    error: null,
  });
}

export function setSelectedVehicle(vehicle: Vehicle | null) {
  useVehicleStore.setState({ selectedVehicle: vehicle, vehicleData: null });
  if (vehicle?.vehicleNo) {
    void pollSelectedVehicleData();
  }
}

export function setVehicleData(vehicleData: VehicleDataClient | null) {
  const previousVehicleData = useVehicleStore.getState().vehicleData;
  const mergedVehicleData = mergeVehicleDataKeepingPreviousOnNull(
    previousVehicleData,
    vehicleData,
  );
  useVehicleStore.setState({ vehicleData: mergedVehicleData, error: null });
}

export function setVehicleStatistics(statistics: VehicleStatusSummary[]) {
  useVehicleStore.setState({ statistics, error: null });
}

export function setVehicleLoading(isLoading: boolean) {
  useVehicleStore.setState({ isLoading });
}

export function setVehicleError(error: string | null) {
  useVehicleStore.setState({ error, isLoading: false });
}

export function startVehiclePolling() {
  if (pollingInterval) return;
  void pollSelectedVehicleData();
  pollingInterval = setInterval(() => {
    void pollSelectedVehicleData();
  }, 1000);
}

export function stopVehiclePolling() {
  if (!pollingInterval) return;
  clearInterval(pollingInterval);
  pollingInterval = null;
}

export function clearVehicleStore() {
  stopVehiclePolling();
  useVehicleStore.setState({
    vehicles: [],
    selectedVehicle: null,
    vehicleData: null,
    statistics: [],
    isLoading: false,
    error: null,
  });
}

export function getVehicleStore(): VehicleState {
  return useVehicleStore.getState();
}
