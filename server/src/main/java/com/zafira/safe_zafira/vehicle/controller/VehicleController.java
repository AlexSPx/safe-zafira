package com.zafira.safe_zafira.vehicle.controller;

import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.safe_zafira.telemetry.speed.SpeedLimitService;
import com.zafira.safe_zafira.vehicle.exception.InvalidVehicleException;
import com.zafira.safe_zafira.vehicle.service.VehicleService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.zafira.vehicle.model.VehicleInitiationRequest;

import lombok.extern.slf4j.Slf4j;

import java.util.Map;

@RestController
@Slf4j
@AllArgsConstructor
public class VehicleController {

    private static final String VEHICLE_HEADER_NAME = "DeviceId";

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
                                            @RequestHeader Map<String, String> headers) {
        String vehicleId = headers.get(VEHICLE_HEADER_NAME);
        if (userId == null || vehicleId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        log.debug("RECEIVING data for vehicle [{}]", vehicleId);
        log.debug("Vehicle [{}]", body);
        service.addVehicleData(userId, vehicleId, body);

        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @GetMapping("/api/vehicles/speed-limit")
    public ResponseEntity<Integer> getSpeedLimit(@AuthenticationPrincipal Long userId,
                                                 @RequestHeader Map<String, String> headers) {


        String vehicleId = headers.get(VEHICLE_HEADER_NAME);
        if (userId == null || vehicleId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        var location = service.getLastLocationDataForDevice(vehicleId);

        var maxSpeed = speedLimitService.getSpeedLimit(location.get().x(), location.get().y());

        return ResponseEntity.status(HttpStatus.OK).body(maxSpeed);
    }

    @ExceptionHandler(InvalidVehicleException.class)
    public ResponseEntity<Void> invalidVehicleExceptionHandler() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }
}
