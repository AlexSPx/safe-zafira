package com.zafira.safe_zafira.vehicle.service;

import com.zafira.user.UserRepository;
import com.zafira.safe_zafira.vehicle.exception.InvalidVehicleException;
import com.zafira.vehicle.model.VehicleData;
import com.zafira.vehicle.model.VehicleInitiationRequest;
import com.zafira.safe_zafira.vehicle.repository.VehicleRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class VehicleService {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;

    public void registerVehicle(long userId, VehicleInitiationRequest vehicleData) {
        if (!userRepository.userExistsById(userId)) {
            //TODO: Better exception
            throw new IllegalArgumentException();
        }

        long vehicleId = vehicleRepository.save(vehicleData);

        vehicleRepository.addUserVehicle(userId, vehicleId);
    }

    public void addVehicleData(Long userId, String vehicleId, VehicleData data) throws InvalidVehicleException {
        if (!userRepository.userExistsById(userId)) {
            //TODO: Better exception
            throw new IllegalArgumentException();
        }

        if (!vehicleRepository.vehicleExistsByVehicleId(vehicleId)) {
            //TODO: Better exception
            throw new IllegalArgumentException();
        }

       vehicleRepository.enterData(data);
    }
}
