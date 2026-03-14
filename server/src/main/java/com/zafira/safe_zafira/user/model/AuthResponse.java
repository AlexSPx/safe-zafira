package com.zafira.safe_zafira.user.model;

public record AuthResponse(
		Long userId,
		String email,
		String username,
		String firstName,
		String familyName,
		String token,
		String message
) {}
