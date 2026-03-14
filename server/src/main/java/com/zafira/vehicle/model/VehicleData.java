package com.zafira.vehicle.model;

import java.util.List;
import java.util.Optional;

public record VehicleData(
        Optional<Double> speed,
        Optional<LocationData> location,
        List<Diagnostic> diagnostics
) {
}
