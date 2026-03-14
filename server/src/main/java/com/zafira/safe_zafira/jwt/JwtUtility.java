package com.zafira.safe_zafira.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtility
{

	private final SecretKey key;
	private final long EXPIRATION_TIME = 1000 * 60 * 60 * 48;

	public JwtUtility(@Value("${jwt.secret}") String secretKey)
	{
		this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
	}

	public String generateToken(long userId, String email)
	{
		return Jwts.builder()
				   .subject(email)
				   .claim("userId", userId)
				   .issuedAt(new Date())
				   .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
				   .signWith(key)
				   .compact();
	}

	public Claims extractClaims(String token) {
		return Jwts.parser()
				.verifyWith(key)
				.build()
				.parseSignedClaims(token)
				.getPayload();
	}

	public long extractUserId(String token) {
		return extractClaims(token).get("userId", Long.class);
	}
}