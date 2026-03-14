package com.zafira.safe_zafira.safety.model;

public record SafetyPermissionDTO(
		Long targetUserId,
		String privacyLevel
) {}