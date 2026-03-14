package com.zafira.safe_zafira.vehicle.service;

import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.safe_zafira.user.UserRepository;
import com.zafira.safe_zafira.vehicle.exception.InvalidVehicleException;
import com.zafira.vehicle.model.VehicleInitiationRequest;
import com.zafira.safe_zafira.vehicle.repository.VehicleRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@AllArgsConstructor
public class VehicleService {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;

    public void registerVehicle(long userId, VehicleInitiationRequest vehicleData) {
        if (!userRepository.userExistsById(userId)) {
            //TODO: Better exception
            log.error("User with id [" + userId +"] does not exist in the db");
            throw new IllegalArgumentException();
        }

        log.debug("Saving vehicle");
        long vehicleId = vehicleRepository.save(vehicleData);

        log.debug("Saving user_vehicle");
        vehicleRepository.addUserVehicle(userId, vehicleId);
    }

    public void addVehicleData(Long userId, String vehicleId, VehicleData data) throws InvalidVehicleException {
        if (!userRepository.userExistsById(userId)) {
            log.error("User with id [" + userId +"] does not exist in the db");
            //TODO: Better exception
            throw new IllegalArgumentException();
        }

        if (!vehicleRepository.vehicleExistsByVehicleId(vehicleId)) {
            log.error("Vehicle with no ["+vehicleId+"] does not exist in the db");
            //TODO: Better exception
            throw new IllegalArgumentException();
        }

        log.debug("Entering vehicle data");
       vehicleRepository.enterData(data);
    }
}
