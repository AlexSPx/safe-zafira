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

	public List<SafetyPermissionDTO> getPermissionsWhereIWatch(Long myUserId) {
		String sql = "SELECT owner_id, privacy_level FROM safety_permissions WHERE viewer_id = :myUserId AND status = 'ACTIVE'";

		return namedJdbc.query(sql, Map.of("myUserId", myUserId), (rs, rowNum) -> new SafetyPermissionDTO(
				rs.getLong("owner_id"),
				rs.getString("privacy_level")
		));
	}

	public List<SafetyPermissionDTO> getPermissionsWhereIAmWatched(Long myUserId) {
		String sql = "SELECT viewer_id, privacy_level FROM safety_permissions WHERE owner_id = :myUserId AND status = 'ACTIVE'";

		return namedJdbc.query(sql, Map.of("myUserId", myUserId), (rs, rowNum) -> new SafetyPermissionDTO(
				rs.getLong("viewer_id"),
				rs.getString("privacy_level")
		));
	}

	public void insertPermission(Long ownerId, Long viewerId, String privacyLevel) {
		String sql = "INSERT INTO safety_permissions (owner_id, viewer_id, privacy_level, status) " +
					 "VALUES (:ownerId, :viewerId, :privacyLevel, 'ACTIVE')";

		MapSqlParameterSource params = new MapSqlParameterSource()
				.addValue("ownerId", ownerId)
				.addValue("viewerId", viewerId)
				.addValue("privacyLevel", privacyLevel);

		namedJdbc.update(sql, params);
	}
}