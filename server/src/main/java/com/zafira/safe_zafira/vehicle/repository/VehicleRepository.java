package com.zafira.safe_zafira.vehicle.repository;

import com.zafira.safe_zafira.model.Dangers;
import com.zafira.safe_zafira.model.LocationData;
import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.vehicle.model.VehicleInitiationRequest;
import lombok.AllArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Repository
@AllArgsConstructor
public class VehicleRepository
{

	private final JdbcTemplate jdbcTemplate;

	public void addUserVehicle(long userId, long vehicleId)
	{
		String sql = "INSERT INTO user_vehicle (user_id, vehicle_id) VALUES (?, ?)";

		jdbcTemplate.update(
				sql,
				userId,
				vehicleId
						   );
	}

	public Long save(VehicleInitiationRequest vehicleData)
	{
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

	public boolean vehicleExistsByVehicleId(String vehicleId)
	{
		String sql = "SELECT EXISTS(SELECT 1 FROM vehicles WHERE vehicle_no = ?)";

		return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
				sql,
				Boolean.class,
				vehicleId
															  ));
	}

	public void enterData(String vehicleId, VehicleData data)
	{
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
			ps.setTimestamp(13, new Timestamp(System.currentTimeMillis()));
			return ps;
		});
	}

	public VehicleData getLatestTelemetryByUserId(Long userId)
	{
		String sql = """
				SELECT vt.* FROM vehicle_telemetry vt
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
}
