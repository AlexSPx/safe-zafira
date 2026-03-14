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

	public List<Map<String, Object>> getPeopleIWatch(Long myUserId) throws SQLException
	{
		String sql = """
				SELECT u.id, u.full_name, u.email, sp.privacy_level 
				FROM safety_permissions sp
				JOIN users u ON u.id = sp.owner_id
				WHERE sp.viewer_id = ? AND sp.status = 'ACTIVE'
				""";
		return jdbc.queryForList(sql, myUserId);
	}

	public List<Map<String, Object>> getMyGuardians(Long myUserId) throws SQLException
	{
		String sql = """
				SELECT u.id, u.full_name, u.email, sp.privacy_level 
				FROM safety_permissions sp
				JOIN users u ON u.id = sp.viewer_id
				WHERE sp.owner_id = ? AND sp.status = 'ACTIVE'
				""";
		return jdbc.queryForList(sql, myUserId);
	}
}
