package com.zafira.vehicle.controller;

import com.zafira.vehicle.exception.InvalidVehicleException;
import com.zafira.vehicle.model.VehicleData;
import com.zafira.vehicle.service.VehicleService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
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
   public HttpStatus initiateDevice(@RequestBody VehicleInitiationRequest body) {
       log.debug("Entered the controller");
       service.registerVehicle(body);
       return HttpStatus.CREATED;
   }

   @PostMapping("/vehicles/data")
    public HttpStatus receiveData(@RequestBody VehicleData body, @RequestHeader Map<String, String> headers) {
        String vehicleId = headers.get(VEHICLE_HEADER_NAME);

        service.addVehicleData(vehicleId, body);

        return HttpStatus.OK;
   }

   @ExceptionHandler(InvalidVehicleException.class)
    public HttpStatus invalidVehicleExceptionHandler() {
       return HttpStatus.BAD_REQUEST;
   }
}
