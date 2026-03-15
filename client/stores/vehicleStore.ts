import { useSyncExternalStore } from 'react';
import type {
  Vehicle,
  VehicleDataClient,
  VehicleStatusSummary,
} from '../services/vehicleService';

type VehicleState = {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  vehicleData: VehicleDataClient | null;
  statistics: VehicleStatusSummary[];
  isLoading: boolean;
  error: string | null;
};

let state: VehicleState = {
  vehicles: [],
  selectedVehicle: null,
  vehicleData: null,
  statistics: [],
  isLoading: false,
  error: null,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useVehicleStore(): VehicleState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function setVehicles(vehicles: Vehicle[]) {
  state = { ...state, vehicles, error: null };
  if (vehicles.length > 0 && !state.selectedVehicle) {
    state.selectedVehicle = vehicles[0];
  }
  notifyListeners();
}

export function setSelectedVehicle(vehicle: Vehicle | null) {
  state = { ...state, selectedVehicle: vehicle };
  notifyListeners();
}

export function setVehicleData(vehicleData: VehicleDataClient | null) {
  state = { ...state, vehicleData, error: null };
  notifyListeners();
}

export function setVehicleStatistics(statistics: VehicleStatusSummary[]) {
  state = { ...state, statistics, error: null };
  notifyListeners();
}

export function setVehicleLoading(isLoading: boolean) {
  state = { ...state, isLoading };
  notifyListeners();
}

export function setVehicleError(error: string | null) {
  state = { ...state, error, isLoading: false };
  notifyListeners();
}

export function clearVehicleStore() {
  state = {
    vehicles: [],
    selectedVehicle: null,
    vehicleData: null,
    statistics: [],
    isLoading: false,
    error: null,
  };
  notifyListeners();
}

export function getVehicleStore(): VehicleState {
  return state;
}
