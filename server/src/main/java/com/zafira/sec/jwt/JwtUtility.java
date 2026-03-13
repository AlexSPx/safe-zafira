package com.zafira.sec.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtility {
	private final String SECRET_KEY = "ZafiraHackathonSuperSecretKeyThatIsVeryLongAndSecure123!";
	private final SecretKey key = Keys.hmacShaKeyFor(SECRET_KEY.getBytes());

	private final long EXPIRATION_TIME = 1000 * 60 * 60 * 24;

	public String generateToken(long userId, String email) {
		return Jwts.builder()
				   .subject(email)
				   .claim("userId", userId)
				   .issuedAt(new Date())
				   .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
				   .signWith(key)
				   .compact();
	}
}