package com.zafira.vehicle.model;

import java.util.List;
import java.util.Optional;

public record VehicleData(
        Optional<Long> speed,
        Optional<LocationData> location,
        List<Diagnostic> diagnostics,
        Optional<Boolean> isCrashed,
        Optional<Integer> battery,
        List<String> dangers
) {
}
