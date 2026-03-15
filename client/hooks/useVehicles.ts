import { useCallback } from 'react';
import { vehicleService } from '../services/vehicleService';
import {
  useVehicleStore,
  setVehicles,
  setVehicleData,
  setVehicleStatistics,
  setVehicleLoading,
  setVehicleError,
  setSelectedVehicle,
} from '../stores/vehicleStore';
import type { Vehicle } from '../services/vehicleService';

export function useVehicles() {
  const store = useVehicleStore();

  const fetchVehicles = useCallback(async () => {
    setVehicleLoading(true);
    try {
      const vehicles = await vehicleService.getVehicles();
      setVehicles(vehicles);
    } catch (error) {
      setVehicleError(
        error instanceof Error ? error.message : 'Failed to fetch vehicles',
      );
    }
  }, []);

  const fetchVehicleData = useCallback(async (deviceId: string) => {
    setVehicleLoading(true);
    try {
      const data = await vehicleService.getVehicleData(deviceId);
      console.log('Fetched vehicle data:', JSON.stringify(data, null, 2));
      setVehicleData(data);
      setVehicleLoading(false);
    } catch (error) {
      console.log('error', error);
      setVehicleError(
        error instanceof Error ? error.message : 'Failed to fetch vehicle data',
      );
    }
  }, []);

  const fetchVehicleStatistics = useCallback(async (minutes: number = 120) => {
    setVehicleLoading(true);
    try {
      const statistics = await vehicleService.getVehicleStatistics(minutes);
      setVehicleStatistics(statistics);
    } catch (error) {
      setVehicleError(
        error instanceof Error ? error.message : 'Failed to fetch statistics',
      );
    }
  }, []);

  const selectVehicle = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  }, []);

  return {
    ...store,
    fetchVehicles,
    fetchVehicleData,
    fetchVehicleStatistics,
    selectVehicle,
  };
}
