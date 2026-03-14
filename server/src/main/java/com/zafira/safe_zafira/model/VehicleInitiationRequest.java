package com.zafira.vehicle.model;

public record VehicleInitiationRequest(String vehicleId, String vin, String model, String make, Double batteryVoltage) {
}