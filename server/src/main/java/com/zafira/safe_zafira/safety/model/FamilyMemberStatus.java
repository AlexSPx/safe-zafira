package com.zafira.safe_zafira.safety.model;

import com.zafira.safe_zafira.model.LocationData;

public record FamilyMemberStatus(
		Long id,
		String name,
		String email,
		boolean isCrashed,
		LocationData location,
		Long speed,
		Integer battery,
		String privacyLevel
)
{

}