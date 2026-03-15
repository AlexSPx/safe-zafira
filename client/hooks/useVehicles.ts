import { useCallback, useEffect } from 'react';
import { vehicleService } from '../services/vehicleService';
import {
  useVehicleStore,
  setVehicles,
  setVehicleData,
  setVehicleStatistics,
  setVehicleLoading,
  setVehicleError,
  setSelectedVehicle,
  startVehiclePolling,
  stopVehiclePolling,
} from '../stores/vehicleStore';
import type { Vehicle } from '../services/vehicleService';

let vehiclePollingSubscribers = 0;

export function useVehicles() {
  const store = useVehicleStore();

  useEffect(() => {
    vehiclePollingSubscribers += 1;
    startVehiclePolling();

    return () => {
      vehiclePollingSubscribers -= 1;
      if (vehiclePollingSubscribers <= 0) {
        stopVehiclePolling();
        vehiclePollingSubscribers = 0;
      }
    };
  }, []);

  const fetchVehicles = useCallback(async () => {
    setVehicleLoading(true);
    try {
      const vehicles = await vehicleService.getVehicles();
      setVehicles(vehicles);
      setVehicleLoading(false);
    } catch (error) {
      setVehicleError(
        error instanceof Error ? error.message : 'Failed to fetch vehicles',
      );
    } finally {
      setVehicleLoading(false);
    }
  }, []);

  const fetchVehicleData = useCallback(async (deviceId: string) => {
    setVehicleLoading(true);
    try {
      const data = await vehicleService.getVehicleData(deviceId);
      console.log('Fetched vehicle data:', JSON.stringify(data, null, 2));
      setVehicleData(data);
    } catch (error) {
      console.log('error', error);
      setVehicleError(
        error instanceof Error ? error.message : 'Failed to fetch vehicle data',
      );
    } finally {
      setVehicleLoading(false);
    }
  }, []);

  const fetchVehicleStatistics = useCallback(async (minutes: number = 120) => {
    setVehicleLoading(true);
    try {
      const statistics = await vehicleService.getVehicleStatistics(minutes);
      setVehicleStatistics(statistics);
      setVehicleLoading(false);
    } catch (error) {
      setVehicleError(
        error instanceof Error ? error.message : 'Failed to fetch statistics',
      );
    } finally {
      setVehicleLoading(false);
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
