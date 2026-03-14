package com.zafira.safe_zafira.vehicle.model;

public record Vehicle(
        Long id,
        String vehicleNo,
        String vin,
        String make,
        String model,
        Double batteryVoltage
) {
}

