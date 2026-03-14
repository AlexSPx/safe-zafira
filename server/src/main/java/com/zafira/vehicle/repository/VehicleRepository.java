package com.zafira.vehicle.repository;

import com.zafira.vehicle.model.VehicleData;
import com.zafira.vehicle.model.VehicleInitiationRequest;
import lombok.AllArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Date;

@Repository
@AllArgsConstructor
public class VehicleRepository {

    private final JdbcTemplate jdbcTemplate;

    public void addUserVehicle(long userId, long vehicleId) {
        String sql = "INSERT INTO user_vehicle (user_id, vehicle_id) VALUES (?, ?)";

        jdbcTemplate.update(
                sql,
                userId,
                vehicleId
        );
    }

    public Long save(VehicleInitiationRequest vehicleData) {
        String sql = "INSERT INTO vehicle (vehicle_no, vin, make, model, batteryVoltage) VALUES (?, ?, ?, ?, ?)";

        return jdbcTemplate.queryForObject(
                sql,
                Long.class,
                vehicleData.vehicleId(),
                vehicleData.vin(),
                vehicleData.make(),
                vehicleData.model(),
                vehicleData.batteryVoltage()
        );
    }

    public boolean vehicleExistsByVehicleId(String vehicleId) {
        String sql = "SELECT EXISTS(SELECT 1 FROM vehicles WHERE vehicle_no = ?)";

        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                sql,
                Boolean.class,
                vehicleId
        ));
    }

    public void enterData(VehicleData data) {
        String sql = """
        INSERT INTO vehicle_data (vehicle_no, battery, dangers, diagnostics, isCrashed, location, speed, ts) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """;

        jdbcTemplate.update(
                sql,
                data.battery(),
                data.dangers(),
                data.diagnostics(),
                data.isCrashed(),
                data.location(),
                data.speed(),
                new Date()
        );
    }
}
