package com.zafira.safe_zafira.vehicle.controller;

import com.zafira.safe_zafira.vehicle.exception.InvalidVehicleException;
import com.zafira.vehicle.model.VehicleData;
import com.zafira.safe_zafira.vehicle.service.VehicleService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
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

    @PostMapping("/vehicles")
    public HttpStatus initiateDevice(@AuthenticationPrincipal Long userId, @RequestBody VehicleInitiationRequest body) {
        log.debug("Entered the controller");

        if (userId == null) {
            return HttpStatus.UNAUTHORIZED;
        }

        service.registerVehicle(userId, body);
        return HttpStatus.CREATED;
    }

    @PostMapping("/vehicles/data")
    public HttpStatus receiveData(@AuthenticationPrincipal Long userId,
                                  @RequestBody VehicleData body,
                                  @RequestHeader Map<String, String> headers) {
        String vehicleId = headers.get(VEHICLE_HEADER_NAME);

        service.addVehicleData(userId, vehicleId, body);

        return HttpStatus.OK;
    }

    @ExceptionHandler(InvalidVehicleException.class)
    public HttpStatus invalidVehicleExceptionHandler() {
        return HttpStatus.BAD_REQUEST;
    }
}
