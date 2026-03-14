package com.zafira.safe_zafira.safety;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

@Repository
@AllArgsConstructor
public class SafetyRepository
{

	private final JdbcTemplate jdbc;

	public List<Map<String, Object>> getPermissionsWhereIWatch(Long myUserId)
	{
		String sql = "SELECT owner_id, privacy_level FROM safety_permissions WHERE viewer_id = ? AND status = 'ACTIVE'";
		return jdbc.queryForList(sql, myUserId);
	}

	public List<Map<String, Object>> getPermissionsWhereIAmWatched(Long myUserId)
	{
		String sql = "SELECT viewer_id, privacy_level FROM safety_permissions WHERE owner_id = ? AND status = 'ACTIVE'";
		return jdbc.queryForList(sql, myUserId);
	}

	public void insertPermission(Long ownerId, Long viewerId, String privacyLevel) {
		String sql = "INSERT INTO safety_permissions (owner_id, viewer_id, privacy_level, status) VALUES (?, ?, ?, 'ACTIVE')";
		jdbc.update(sql, ownerId, viewerId, privacyLevel);
	}
}
