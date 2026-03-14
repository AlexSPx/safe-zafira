package com.zafira.user;

import com.zafira.user.model.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UserRepository
{

	private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<User> userRowMapper = (rs, rowNum) -> new User(
            rs.getLong("id"),
            rs.getString("email"),
            rs.getString("password_hash")
    );

    public Optional<User> findByEmail(String email) {
        String sql = "SELECT id, email, password_hash FROM users WHERE email = ?";

        List<User> users = jdbcTemplate.query(sql, userRowMapper, email);

        return users.stream().findFirst();
    }

    public long save(String email, String passwordHash) {
        String sql = "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id";

        return jdbcTemplate.queryForObject(sql, Long.class, email, passwordHash);
    }

    public Optional<User> findById(long id) {
        String sql = "SELECT id, email, password_hash FROM users WHERE id = ?";

        List<User> users = jdbcTemplate.query(sql, userRowMapper, id);

        return users.stream().findFirst();
    }

    public boolean userExistsById(long id) {
        String sql = "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)";

        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                sql,
                Boolean.class,
                id
        ));
    }
}
