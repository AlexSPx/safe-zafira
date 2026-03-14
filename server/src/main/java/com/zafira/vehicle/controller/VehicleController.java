package com.zafira.vehicle.controller;

import com.zafira.vehicle.service.VehicleService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.zafira.vehicle.model.VehicleInitiationRequest;

import lombok.extern.slf4j.Slf4j;

@RestController
@Slf4j
@AllArgsConstructor
public class VehicleController {

    private final VehicleService service;

   @PostMapping("/vehicles/init")
   public HttpStatus initiateDevice(@RequestBody VehicleInitiationRequest body) {
       log.debug("Entered the controller");
       service.registerVehicle(body);
       return HttpStatus.CREATED;
   }
}
