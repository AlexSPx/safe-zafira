package com.zafira.safe_zafira.vehicle.repository;

import com.zafira.safe_zafira.model.Dangers;
import com.zafira.safe_zafira.model.LocationData;
import com.zafira.safe_zafira.model.TelemetryPoint;
import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.vehicle.model.VehicleInitiationRequest;
import lombok.AllArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

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
        String sql = "INSERT INTO vehicles (vehicle_no, vin, make, model, batteryVoltage) VALUES (?, ?, ?, ?, ?) RETURNING id";

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

    public void enterData(String vehicleId, VehicleData data) {
        String sql = """
                INSERT INTO vehicle_telemetry (vehicle_no, latitude, longitude, speed, battery, battery_car, fuel, dangers, diagnostics, airbags, abs, esp, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql);
            ps.setString(1, vehicleId);
            ps.setObject(2, data.location().map(LocationData::x).orElse(null));
            ps.setObject(3, data.location().map(LocationData::y).orElse(null));
            ps.setObject(4, data.speed().orElse(null));
            ps.setObject(5, data.battery().orElse(null));
            ps.setObject(6, data.batteryCar().orElse(null));
            ps.setObject(7, data.fuel().orElse(null));

            if (data.dangers() != null) {
                String[] dangersNames = data.dangers().stream().map(Dangers::name).toArray(String[]::new);
                ps.setArray(8, con.createArrayOf("varchar", dangersNames));
            } else {
                ps.setNull(8, java.sql.Types.ARRAY);
            }

            if (data.diagnostics() != null) {
                ps.setArray(9, con.createArrayOf("varchar", data.diagnostics().toArray(new String[0])));
            } else {
                ps.setNull(9, java.sql.Types.ARRAY);
            }

            ps.setObject(10, data.airbags().orElse(null));
            ps.setObject(11, data.abs().orElse(null));
            ps.setObject(12, data.esp().orElse(null));
            ps.setObject(13, OffsetDateTime.now(ZoneId.systemDefault()));
            return ps;
        });
    }

    public List<String> getAllVehicleNosWithLocation() {
        String sql = """
                SELECT DISTINCT vehicle_no FROM vehicle_telemetry
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL
                """;

        return jdbcTemplate.queryForList(sql, String.class);
    }

    public List<TelemetryPoint> getRecentLocationPoints(String vehicleNo, int seconds) {
        String sql = """
                SELECT latitude, longitude, ts FROM vehicle_telemetry
                WHERE vehicle_no = ? AND latitude IS NOT NULL AND longitude IS NOT NULL
                AND ts >= ?
                ORDER BY ts ASC
                """;

        Timestamp cutoff = Timestamp.from(Instant.now().minusSeconds(seconds));

        return jdbcTemplate.query(sql, (rs, _) -> new TelemetryPoint(
                rs.getTimestamp("ts").toInstant(),
                rs.getDouble("latitude"),
                rs.getDouble("longitude")
        ), vehicleNo, cutoff);
    }

    public LocationData getLatestLocationByVehicleNo(String vehicleNo) {
        String sql = """
                SELECT latitude, longitude FROM vehicle_telemetry
                WHERE vehicle_no = ? AND latitude IS NOT NULL AND longitude IS NOT NULL
                ORDER BY ts DESC LIMIT 1
                """;

        return jdbcTemplate.queryForObject(sql, (rs, _) -> new LocationData(
                rs.getDouble("latitude"),
                rs.getDouble("longitude")
        ), vehicleNo);
    }

	public VehicleData getLatestTelemetryByUserId(Long userId)
	{
		String sql = """
				SELECT CAST(vt.speed AS BIGINT) AS speed,
				       CAST(vt.latitude AS DOUBLE PRECISION) AS latitude,
				       CAST(vt.longitude AS DOUBLE PRECISION) AS longitude,
				       CAST(vt.battery AS DOUBLE PRECISION) AS battery,
				       CAST(vt.battery_car AS DOUBLE PRECISION) AS battery_car,
				       CAST(vt.fuel AS DOUBLE PRECISION) AS fuel,
				       vt.dangers, vt.diagnostics, vt.airbags, vt.abs, vt.esp
				FROM vehicle_telemetry vt
				JOIN vehicles v ON vt.vehicle_no = v.vehicle_no
				JOIN user_vehicle uv ON v.id = uv.vehicle_id
				WHERE uv.user_id = ? ORDER BY ts DESC LIMIT 1
				""";

		return jdbcTemplate.queryForObject(sql, (rs, _) -> {
			LocationData loc = new LocationData(
					rs.getDouble("latitude"),
					rs.getDouble("longitude")
			);

			java.sql.Array dangersArr = rs.getArray("dangers");
			java.sql.Array diagnosticsArr = rs.getArray("diagnostics");

			return new VehicleData(
					Optional.ofNullable(rs.getObject("speed", Long.class)),
					Optional.of(loc),
					diagnosticsArr != null ? List.of((String[]) diagnosticsArr.getArray()) : List.of(),
					Optional.ofNullable(rs.getObject("battery", Double.class)),
					Optional.ofNullable(rs.getObject("battery_car", Double.class)),
					Optional.ofNullable(rs.getObject("fuel", Double.class)),
					dangersArr != null ? Arrays.stream((String[]) dangersArr.getArray()).map(Dangers::valueOf).toList() : List.of(),
					Optional.ofNullable(rs.getObject("airbags", Boolean.class)),
					Optional.ofNullable(rs.getObject("abs", Boolean.class)),
					Optional.ofNullable(rs.getObject("esp", Boolean.class))
			);
		}, userId);
	}

    public VehicleData getLatestTelemetryByVehicleNo(String vehicleNo)
    {
        String sql = """
				SELECT CAST(speed AS BIGINT) AS speed,
				       CAST(latitude AS DOUBLE PRECISION) AS latitude,
				       CAST(longitude AS DOUBLE PRECISION) AS longitude,
				       CAST(battery AS DOUBLE PRECISION) AS battery,
				       CAST(battery_car AS DOUBLE PRECISION) AS battery_car,
				       CAST(fuel AS DOUBLE PRECISION) AS fuel,
				       dangers, diagnostics, airbags, abs, esp
				FROM vehicle_telemetry
				WHERE vehicle_no = ? ORDER BY ts DESC LIMIT 1
				""";

        return jdbcTemplate.queryForObject(sql, (rs, _) -> {
            LocationData loc = new LocationData(
                    rs.getDouble("latitude"),
                    rs.getDouble("longitude")
            );

            java.sql.Array dangersArr = rs.getArray("dangers");
            java.sql.Array diagnosticsArr = rs.getArray("diagnostics");

            return new VehicleData(
                    Optional.ofNullable(rs.getObject("speed", Long.class)),
                    Optional.of(loc),
                    diagnosticsArr != null ? List.of((String[]) diagnosticsArr.getArray()) : List.of(),
                    Optional.ofNullable(rs.getObject("battery", Double.class)),
                    Optional.ofNullable(rs.getObject("battery_car", Double.class)),
                    Optional.ofNullable(rs.getObject("fuel", Double.class)),
                    dangersArr != null ? Arrays.stream((String[]) dangersArr.getArray()).map(Dangers::valueOf).toList() : List.of(),
                    Optional.ofNullable(rs.getObject("airbags", Boolean.class)),
                    Optional.ofNullable(rs.getObject("abs", Boolean.class)),
                    Optional.ofNullable(rs.getObject("esp", Boolean.class))
            );
        }, vehicleNo);
    }
}
