package com.zafira.safe_zafira.model;

import java.util.List;
import java.util.Optional;

public record VehicleData(
        Optional<Long> speed,
        Optional<LocationData> location,
        List<String> diagnostics,
        Optional<Double> battery,
        Optional<Double> batteryCar,
        Optional<Double> fuel,
        List<Dangers> dangers,
        Optional<Boolean> airbags,
        Optional<Boolean> abs,
        Optional<Boolean> esp
) {
}
