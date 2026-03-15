package com.zafira.safe_zafira.vehicle.controller;

import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.safe_zafira.model.VehicleDataClient;
import com.zafira.safe_zafira.telemetry.speed.SpeedLimitService;
import com.zafira.safe_zafira.vehicle.exception.InvalidVehicleException;
import com.zafira.safe_zafira.vehicle.model.Vehicle;
import com.zafira.safe_zafira.vehicle.model.VehicleStatusSummary;
import com.zafira.safe_zafira.vehicle.service.VehicleService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.zafira.vehicle.model.VehicleInitiationRequest;

import lombok.extern.slf4j.Slf4j;

import java.util.List;

@RestController
@Slf4j
@AllArgsConstructor
public class VehicleController {

    private final VehicleService service;
    private final SpeedLimitService speedLimitService;

    @PostMapping("/api/vehicles")
    public ResponseEntity<Void> initiateDevice(@AuthenticationPrincipal Long userId, @RequestBody VehicleInitiationRequest body) {
        log.debug("Entered the controller");

        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        service.registerVehicle(userId, body);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/api/vehicles/data")
    public ResponseEntity<Void> receiveData(@AuthenticationPrincipal Long userId,
                                            @RequestBody VehicleData body,
                                            @RequestParam String device) {
        if (userId == null || device == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        log.debug("RECEIVING data for vehicle [{}]", device);
        log.debug("Vehicle [{}]", body);
        service.addVehicleData(userId, device, body);

        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @GetMapping("/api/vehicles/speed-limit")
    public ResponseEntity<Integer> getSpeedLimit(@AuthenticationPrincipal Long userId,
                                                 @RequestParam String device) {

        if (userId == null || device == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        var location = service.getLastLocationDataForDevice(device);
        if (location.isEmpty()) {
            return ResponseEntity.status(HttpStatus.OK).body(null);
        }

        var maxSpeed = speedLimitService.getSpeedLimit(location.get().x(), location.get().y());

        return ResponseEntity.status(HttpStatus.OK).body(maxSpeed);
    }

    @GetMapping("/api/vehicles/data")
    public ResponseEntity<VehicleDataClient> getLatestVehicleData(@AuthenticationPrincipal Long userId,
                                                                  @RequestParam String device) {
        if (userId == null || device == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.status(HttpStatus.OK).body(service.getCurrentClientVehicleData(device).orElse(null));
    }

	@GetMapping("/api/vehicles/family/{memberId}")
	public ResponseEntity<List<Vehicle>> getVehiclesForFamilyMember(@AuthenticationPrincipal Long userId,
                                                                    @PathVariable Long memberId)
	{
		List<Vehicle> vehicles = service.getAllVehiclesDataForUser(memberId);
		return ResponseEntity.ok(vehicles);
	}


    @GetMapping("/api/vehicles")
    public ResponseEntity<List<Vehicle>> getVehiclesForCurrentUser(@AuthenticationPrincipal Long userId)
    {
        List<Vehicle> vehicles = service.getAllVehiclesForUser(userId);
        return ResponseEntity.ok(vehicles);
    }

	@GetMapping("/api/vehicles/statistics")
	public ResponseEntity<List<VehicleStatusSummary>> getVehicleStatusForUser(
			@AuthenticationPrincipal Long userId,
			@RequestParam(defaultValue = "120") int minutes)
	{
		if (userId == null)
		{
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

		List<VehicleStatusSummary> status = service.getAggregatedVehicleStatus(userId, minutes);
		return ResponseEntity.ok(status);
	}

	@ExceptionHandler(InvalidVehicleException.class)
	public ResponseEntity<Void> invalidVehicleExceptionHandler()
	{
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
	}
}
