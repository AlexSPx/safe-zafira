package com.zafira.safe_zafira.model;

import javax.tools.Diagnostic;
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
