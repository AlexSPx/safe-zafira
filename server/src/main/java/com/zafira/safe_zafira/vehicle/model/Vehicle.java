package com.zafira.safe_zafira.vehicle.model;

import java.math.BigDecimal;

public record Vehicle(
        Long id,
        String vehicleNo,
        String vin,
        String make,
        String model,
        BigDecimal batteryVoltage
) {
}

