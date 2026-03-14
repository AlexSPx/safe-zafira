package com.zafira.safe_zafira.vehicle.service;

import com.zafira.safe_zafira.model.LocationData;
import com.zafira.safe_zafira.model.TelemetryPoint;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class LocationExtrapolationService {

    private static final int MAX_STALENESS_SECONDS = 10;

    /**
     * Returns an extrapolated location based on a window of recent telemetry points.
     * Falls back to the last known position if there are fewer than 2 points or the
     * data is stale (last point older than MAX_STALENESS_SECONDS).
     */
    public LocationData extrapolate(List<TelemetryPoint> points) {
        if (points.isEmpty()) {
            throw new IllegalArgumentException("No telemetry points to extrapolate from");
        }

        TelemetryPoint last = points.getLast();
        long secondsSinceLast = Duration.between(last.ts(), Instant.now()).getSeconds();

        if (points.size() < 2 || secondsSinceLast > MAX_STALENESS_SECONDS) {
            return new LocationData(last.latitude(), last.longitude());
        }

        Instant origin = points.getFirst().ts();

        double[] t    = points.stream().mapToDouble(p -> toSeconds(origin, p.ts())).toArray();
        double[] lats = points.stream().mapToDouble(TelemetryPoint::latitude).toArray();
        double[] lons = points.stream().mapToDouble(TelemetryPoint::longitude).toArray();

        double dLatDt = slope(t, lats);
        double dLonDt = slope(t, lons);

        double tFuture = toSeconds(last.ts(), Instant.now());

        return new LocationData(
                last.latitude()  + dLatDt * tFuture,
                last.longitude() + dLonDt * tFuture
        );
    }

    private double slope(double[] t, double[] values) {
        int n = t.length;
        double sumT = 0, sumV = 0, sumTT = 0, sumTV = 0;
        for (int i = 0; i < n; i++) {
            sumT  += t[i];
            sumV  += values[i];
            sumTT += t[i] * t[i];
            sumTV += t[i] * values[i];
        }
        double denom = n * sumTT - sumT * sumT;
        return denom == 0 ? 0 : (n * sumTV - sumT * sumV) / denom;
    }

    private double toSeconds(Instant from, Instant to) {
        return Duration.between(from, to).toMillis() / 1000.0;
    }
}
