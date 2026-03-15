package com.zafira.safe_zafira.vehicle.model;

import com.zafira.safe_zafira.model.LocationData;

import java.util.List;

public record VehicleStatusSummary(
        String vehicleNo,
        Double avgSpeed,
        Double maxSpeed,
        Double avgBattery,
        Double avgRpm,
        LocationData lastLocation,
        List<String> allDangers,
        List<String> allDiagnostics,
        int dataPoints
) {
}

