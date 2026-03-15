package com.zafira.safe_zafira.model;

import java.util.List;
import java.util.Optional;

public record VehicleData(
        Optional<Long> speed,
        Optional<Long> rpm,
        Optional<Double> steering,
        Optional<Double> battery,
        Optional<Long> mileage,
        Optional<Boolean> brakePedal,
        Optional<Boolean> airbags,
        Optional<Boolean> abs,
        Optional<LocationData> location,
        List<String> diagnostics,
        List<Dangers> dangers
) {
}
