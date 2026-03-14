package com.zafira.safe_zafira.user;

import com.zafira.safe_zafira.user.model.User;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UserRepository
{

	private final JdbcTemplate jdbcTemplate;

	public UserRepository(JdbcTemplate jdbcTemplate)
	{
		this.jdbcTemplate = jdbcTemplate;
	}

	private final RowMapper<User> userRowMapper = (rs, rowNum) -> new User(
			rs.getLong("id"),
			rs.getString("email"),
			rs.getString("password_hash"),
			rs.getString("username"),
			rs.getString("first_name"),
			rs.getString("family_name")
	);

	@Cacheable(value = "users", key = "#email")
	public Optional<User> findByEmail(String email)
	{
		String sql = "SELECT id, email, password_hash, username, first_name, family_name FROM users WHERE email = ?";

		List<User> users = jdbcTemplate.query(sql, userRowMapper, email);

		return users.stream().findFirst();
	}

	public User save(String email, String passwordHash, String username, String firstName, String familyName)
	{
		String sql = """
				INSERT INTO users (email, password_hash, username, first_name, family_name)
				VALUES (?, ?, ?, ?, ?)
				RETURNING id, email, password_hash, username, first_name, family_name
				""";

		return jdbcTemplate.queryForObject(sql, userRowMapper, email, passwordHash, username, firstName, familyName);
	}

	@Cacheable(value = "users", key = "#id")
	public Optional<User> findById(long id)
	{
		String sql = "SELECT id, email, password_hash, username, first_name, family_name FROM users WHERE id = ?";

		List<User> users = jdbcTemplate.query(sql, userRowMapper, id);

		return users.stream().findFirst();
	}

	@Cacheable(value = "userExists", key = "#id")
	public boolean userExistsById(long id)
	{
		String sql = "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)";

		return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
				sql,
				Boolean.class,
				id
															  ));
	}
}
