package com.zafira.safe_zafira.telemetry.speed;

import com.zafira.safe_zafira.vehicle.VehicleStateCache;
import com.zafira.safe_zafira.vehicle.repository.VehicleRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@AllArgsConstructor
public class SpeedLimitScheduler {

    private final VehicleRepository vehicleRepository;
    private final SpeedLimitService speedLimitService;
    private final VehicleStateCache vehicleStateCache;

    @Scheduled(fixedRateString = "${scheduler.speed-limit.rate-ms:30000}")
    public void updateSpeedLimits() {
        var vehicleNos = vehicleRepository.getAllVehicleNosWithLocation();
        log.debug("Updating speed limits for {} vehicles", vehicleNos.size());

        for (String vehicleNo : vehicleNos) {
            try {
                var location = vehicleRepository.getLatestLocationByVehicleNo(vehicleNo);
                Integer speedLimit = speedLimitService.getSpeedLimit(location.y(), location.x());

                if (speedLimit != null) {
                    vehicleStateCache.put(vehicleNo, speedLimit.longValue());
                    log.debug("Speed limit for vehicle [{}] set to {}", vehicleNo, speedLimit);
                }
            } catch (Exception e) {
                log.warn("Failed to update speed limit for vehicle [{}]: {}", vehicleNo, e.getMessage());
            }
        }
    }
}
