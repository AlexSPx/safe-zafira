package com.zafira.safe_zafira.model;

import java.time.Instant;

public record TelemetryPoint(Instant ts, double latitude, double longitude) {
}
