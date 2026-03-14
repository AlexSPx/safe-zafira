package com.zafira.safe_zafira.vehicle.service;

import com.zafira.safe_zafira.model.LocationData;
import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.safe_zafira.user.UserRepository;
import com.zafira.safe_zafira.vehicle.exception.InvalidVehicleException;
import com.zafira.safe_zafira.vehicle.model.Vehicle;
import com.zafira.vehicle.model.VehicleInitiationRequest;
import com.zafira.safe_zafira.vehicle.repository.VehicleRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@AllArgsConstructor
public class VehicleService
{

	private final UserRepository userRepository;
	private final VehicleRepository vehicleRepository;

	@Transactional
	public void registerVehicle(long userId, VehicleInitiationRequest vehicleData)
	{
		if (!userRepository.userExistsById(userId))
		{
			log.error("User with id [{}] does not exist in the db", userId);
			throw new IllegalArgumentException("User not found");
		}

		log.debug("Saving vehicle and linking to user [{}]", userId);
		long vehicleId = vehicleRepository.save(vehicleData);
		vehicleRepository.addUserVehicle(userId, vehicleId);
	}

	@Transactional
	public void addVehicleData(Long userId, String vehicleId, VehicleData data) throws InvalidVehicleException
	{
		if (!userRepository.userExistsById(userId))
		{
			log.error("User with id [{}] does not exist in the db", userId);
			throw new IllegalArgumentException("User not found");
		}

		if (!vehicleRepository.vehicleExistsByVehicleId(vehicleId))
		{
			log.error("Vehicle with no [{}] does not exist in the db", vehicleId);
			throw new InvalidVehicleException("Vehicle not found");
		}

		log.debug("Entering telemetry data for vehicle [{}]", vehicleId);
		vehicleRepository.enterData(vehicleId, data);
	}

    public Optional<LocationData> getLastLocationDataForDevice(String vehicleId) {

		if (!vehicleRepository.vehicleExistsByVehicleId(vehicleId))
		{
			log.error("Vehicle with no [{}] does not exist in the db", vehicleId);
			throw new InvalidVehicleException("Vehicle not found");
		}

		log.debug("Getting the location data for vehicle [{}]", vehicleId);
		return Optional.of(vehicleRepository.getLatestLocationByVehicleNo(vehicleId));
	}

    public List<Vehicle> getAllVehiclesDataForUser(Long memberId)
    {
        log.debug("Getting all vehicles for member [{}]", memberId);
        return vehicleRepository.getAllVehiclesByUserId(memberId);
    }
}