package com.zafira.safe_zafira.safety;

import com.zafira.safe_zafira.safety.model.SafetyPermissionDTO;
import lombok.AllArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
@AllArgsConstructor
public class SafetyRepository {

	private final NamedParameterJdbcTemplate namedJdbc;

	public List<SafetyPermissionDTO> getDriversWatchedByMe(Long myGuardianId) {
		String sql = "SELECT driver_id, privacy_level FROM safety_permissions WHERE guardian_id = :myId AND status = 'ACTIVE'";

		return namedJdbc.query(sql, Map.of("myId", myGuardianId), (rs, rowNum) -> new SafetyPermissionDTO(
				rs.getLong("driver_id"),
				rs.getString("privacy_level")
		));
	}

	public void insertOrUpdatePermission(Long driverId, Long guardianId, String privacyLevel) {
		String sql = """
                 INSERT INTO safety_permissions (driver_id, guardian_id, privacy_level, status) 
                 VALUES (:driverId, :guardianId, :privacyLevel, 'ACTIVE')
                 ON CONFLICT (driver_id, guardian_id) 
                 DO UPDATE SET privacy_level = EXCLUDED.privacy_level
                 """;

		MapSqlParameterSource params = new MapSqlParameterSource()
				.addValue("driverId", driverId)
				.addValue("guardianId", guardianId)
				.addValue("privacyLevel", privacyLevel);

		namedJdbc.update(sql, params);
	}
}