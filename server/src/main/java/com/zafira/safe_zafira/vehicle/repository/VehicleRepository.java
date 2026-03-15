package com.zafira.safe_zafira.vehicle.repository;

import com.zafira.safe_zafira.model.Dangers;
import com.zafira.safe_zafira.model.LocationData;
import com.zafira.safe_zafira.model.TelemetryPoint;
import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.safe_zafira.vehicle.model.Vehicle;
import com.zafira.safe_zafira.vehicle.model.VehicleStatusSummary;
import com.zafira.vehicle.model.VehicleInitiationRequest;
import lombok.AllArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
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

    public void addUserVehicle(long userId, long vehicleNo) {
        String sql = "INSERT INTO user_vehicle (user_id, vehicle_id) VALUES (?, ?)";

        jdbcTemplate.update(
                sql,
                userId,
                vehicleNo
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

    public boolean vehicleExistsByVehicleNo(String vehicleId) {
        String sql = "SELECT EXISTS(SELECT 1 FROM vehicles WHERE vehicle_no = ?)";

        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                sql,
                Boolean.class,
                vehicleId
        ));
    }

    public void enterData(String vehicleId, VehicleData data) {
        String sql = """
                INSERT INTO vehicle_telemetry (vehicle_no, latitude, longitude, speed, battery, steering, mileage, brake_pedal, rpm, dangers, diagnostics, airbags, abs, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql);
            ps.setString(1, vehicleId);
            ps.setObject(2, data.location().map(LocationData::y).orElse(null));
            ps.setObject(3, data.location().map(LocationData::x).orElse(null));
            ps.setObject(4, data.speed().orElse(null));
            ps.setObject(5, data.battery().orElse(null));
            ps.setObject(6, data.steering().orElse(null));
            ps.setObject(7, data.mileage().orElse(null));
            ps.setObject(8, data.brakePedal().orElse(null));
            ps.setObject(9, data.rpm().orElse(null));

            if (data.dangers() != null) {
                String[] dangersNames = data.dangers().stream().map(Dangers::name).toArray(String[]::new);
                ps.setArray(10, con.createArrayOf("varchar", dangersNames));
            } else {
                ps.setNull(10, java.sql.Types.ARRAY);
            }

            if (data.diagnostics() != null) {
                ps.setArray(11, con.createArrayOf("varchar", data.diagnostics().toArray(new String[0])));
            } else {
                ps.setNull(10, java.sql.Types.ARRAY);
            }

            ps.setObject(12, data.airbags().orElse(null));
            ps.setObject(13, data.abs().orElse(null));
            ps.setObject(14, OffsetDateTime.now(ZoneId.systemDefault()));
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
                SELECT CAST(latitude AS DOUBLE PRECISION) as latitude, CAST(longitude AS DOUBLE PRECISION) as longitude FROM vehicle_telemetry
                WHERE vehicle_no = ? AND latitude IS NOT NULL AND longitude IS NOT NULL
                ORDER BY ts DESC LIMIT 1
                """;

        return jdbcTemplate.query(sql, (rs, _) -> parseLocation(rs), vehicleNo).getFirst();
    }

	private LocationData parseLocation(ResultSet rs) throws java.sql.SQLException
	{
		var lat = rs.getObject("latitude", Double.class);
		var log = rs.getObject("longitude", Double.class);
		LocationData loc = null;
		if (lat != null && log != null)
		{
			loc = new LocationData(
					lat, // inverting
					log
			);
		}
		return loc;
	}

    public Optional<LocationData> getLastLocationByUserId(Long userId) {
        String sql = """
                SELECT CAST(vt.latitude AS DOUBLE PRECISION) AS latitude,
                       CAST(vt.longitude AS DOUBLE PRECISION) AS longitude
                FROM vehicle_telemetry vt
                JOIN vehicles v ON vt.vehicle_no = v.vehicle_no
                JOIN user_vehicle uv ON v.id = uv.vehicle_id
                WHERE uv.user_id = ?
                  AND vt.latitude IS NOT NULL AND vt.longitude IS NOT NULL
                ORDER BY vt.ts DESC LIMIT 1
                """;

        List<LocationData> results = jdbcTemplate.query(sql, (rs, _) -> parseLocation(rs), userId);
        return results.isEmpty() ? Optional.empty() : Optional.ofNullable(results.getFirst());
    }

    public List<Vehicle> getAllVehiclesByUserId(Long userId) {
        String sql = """
                SELECT v.id, v.vehicle_no, v.vin, v.make, v.model, v.batteryVoltage
                FROM vehicles v
                JOIN user_vehicle uv ON v.id = uv.vehicle_id
                WHERE uv.user_id = ?
                """;

        return jdbcTemplate.query(sql, (rs, _) -> new Vehicle(
                rs.getLong("id"),
                rs.getString("vehicle_no"),
                rs.getString("vin"),
                rs.getString("make"),
                rs.getString("model"),
                rs.getBigDecimal("batteryVoltage")
        ), userId);
    }

    public List<VehicleStatusSummary> getAggregatedStatusByUserId(Long userId, int minutes) {
        String sql = """
                SELECT vt.vehicle_no,
                       AVG(CAST(vt.speed AS DOUBLE PRECISION)) AS avg_speed,
                       MAX(CAST(vt.speed AS DOUBLE PRECISION)) AS max_speed,
                       AVG(CAST(vt.battery AS DOUBLE PRECISION)) AS avg_battery,
                       AVG(CAST(vt.rpm AS DOUBLE PRECISION)) AS avg_rpm,
                       (array_agg(CAST(vt.latitude AS DOUBLE PRECISION) ORDER BY vt.ts DESC))[1] AS last_lat,
                       (array_agg(CAST(vt.longitude AS DOUBLE PRECISION) ORDER BY vt.ts DESC))[1] AS last_lon,
                       array_agg(DISTINCT unnested_danger) FILTER (WHERE unnested_danger IS NOT NULL) AS all_dangers,
                       array_agg(DISTINCT unnested_diag) FILTER (WHERE unnested_diag IS NOT NULL) AS all_diagnostics,
                       COUNT(*)::int AS data_points
                FROM vehicle_telemetry vt
                JOIN vehicles v ON vt.vehicle_no = v.vehicle_no
                JOIN user_vehicle uv ON v.id = uv.vehicle_id
                LEFT JOIN LATERAL unnest(vt.dangers) AS unnested_danger ON TRUE
                LEFT JOIN LATERAL unnest(vt.diagnostics) AS unnested_diag ON TRUE
                WHERE uv.user_id = ?
                  AND vt.ts >= NOW() - (? * INTERVAL '1 minute')
                GROUP BY vt.vehicle_no
                """;

        return jdbcTemplate.query(sql, (rs, _) -> {
            LocationData lastLoc = new LocationData(
                    rs.getDouble("last_lon"),
                    rs.getDouble("last_lat")
            );

            java.sql.Array dangersArr = rs.getArray("all_dangers");
            java.sql.Array diagArr = rs.getArray("all_diagnostics");

            return new VehicleStatusSummary(
                    rs.getString("vehicle_no"),
                    rs.getObject("avg_speed") != null ? rs.getDouble("avg_speed") : null,
                    rs.getObject("max_speed") != null ? rs.getDouble("max_speed") : null,
                    rs.getObject("avg_battery") != null ? rs.getDouble("avg_battery") : null,
                    rs.getObject("avg_rpm") != null ? rs.getDouble("avg_rpm") : null,
                    lastLoc,
                    dangersArr != null ? List.of((String[]) dangersArr.getArray()) : List.of(),
                    diagArr != null ? List.of((String[]) diagArr.getArray()) : List.of(),
                    rs.getInt("data_points")
            );
        }, userId, minutes);
    }

    public VehicleData getLatestTelemetryByVehicleNo(String vehicleNo) {
        String sql = """
                SELECT CAST(speed AS BIGINT) AS speed,
                       CAST(latitude AS DOUBLE PRECISION) AS latitude,
                       CAST(longitude AS DOUBLE PRECISION) AS longitude,
                       CAST(battery AS DOUBLE PRECISION) AS battery,
                       CAST(mileage AS BIGINT) AS mileage,
                       CAST(steering AS DOUBLE PRECISION) AS steering,
                       CAST(rpm AS BIGINT) AS rpm,
                       brake_pedal, dangers, diagnostics, airbags, abs
                FROM vehicle_telemetry
                WHERE vehicle_no = ? ORDER BY ts DESC LIMIT 1
                """;

        return jdbcTemplate.query(sql, (rs, _) -> {
            LocationData loc = parseLocation(rs);

            java.sql.Array dangersArr = rs.getArray("dangers");
            java.sql.Array diagnosticsArr = rs.getArray("diagnostics");

            return new VehicleData(
                    Optional.ofNullable(rs.getObject("speed", Long.class)),
                    Optional.ofNullable(rs.getObject("rpm", Long.class)),
                    Optional.ofNullable(rs.getObject("steering", Double.class)),
                    Optional.ofNullable(rs.getObject("battery", Double.class)),
                    Optional.ofNullable(rs.getObject("mileage", Long.class)),
                    Optional.ofNullable(rs.getObject("brake_pedal", Boolean.class)),
                    Optional.ofNullable(rs.getObject("airbags", Boolean.class)),
                    Optional.ofNullable(rs.getObject("abs", Boolean.class)),
                    loc == null ? Optional.empty() : Optional.of(loc),
                    diagnosticsArr != null ? List.of((String[]) diagnosticsArr.getArray()) : List.of(),
                    dangersArr != null ? Arrays.stream((String[]) dangersArr.getArray()).map(Dangers::valueOf).toList() : List.of()
            );
        }, vehicleNo).getFirst();
    }
}
