package com.zafira.safe_zafira.vehicle;

import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class VehicleStateCache {

    private final ConcurrentHashMap<String, Long> state = new ConcurrentHashMap<>();

    public void put(String vehicleNo, Long value) {
        state.put(vehicleNo, value);
    }

    public Optional<Long> get(String vehicleNo) {
        return Optional.ofNullable(state.get(vehicleNo));
    }
}
