package com.zafira.safe_zafira.safety;

import com.zafira.safe_zafira.model.Dangers;
import com.zafira.safe_zafira.safety.model.GuardedMemberSummary;
import com.zafira.safe_zafira.safety.model.SafetyPermissionDTO;
import com.zafira.safe_zafira.user.UserRepository;
import com.zafira.safe_zafira.user.model.User;
import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.safe_zafira.model.LocationData;
import com.zafira.safe_zafira.safety.model.FamilyMemberStatus;
import com.zafira.safe_zafira.vehicle.repository.VehicleRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.ArrayList;

@Service
@Slf4j
@AllArgsConstructor
public class GuardianService
{

	private final SafetyRepository safetyRepo;
	private final UserRepository userRepo;
	private final VehicleRepository vehicleRepo;

	public List<GuardedMemberSummary> getFamilyDashboard(Long myId)
	{
		List<SafetyPermissionDTO> permissions = safetyRepo.getDriversWatchedByMe(myId);
		List<GuardedMemberSummary> dashboard = new ArrayList<>();

		for (SafetyPermissionDTO row : permissions)
		{
			Optional<User> userOpt = userRepo.findById(row.targetUserId());
			if (userOpt.isEmpty())
			{
				log.error("No user found for permission");
				continue;
			}

			User user = userOpt.get();
			dashboard.add(new GuardedMemberSummary(
					user.getId(),
					user.getUsername(),
					user.getFamilyName()
			));
		}

		return dashboard;
	}

	public FamilyMemberStatus getMemberStatus(Long myId, Long memberId)
	{
		SafetyPermissionDTO permission = safetyRepo.getDriversWatchedByMe(myId)
												   .stream()
												   .filter(p -> p.targetUserId().equals(memberId))
												   .findFirst()
												   .orElseThrow(() -> new IllegalArgumentException("You don't have permission to view this member"));

		User user = userRepo.findById(memberId)
							.orElseThrow(() -> new IllegalArgumentException("User not found"));

		String privacy = permission.privacyLevel();
		VehicleData rawData = vehicleRepo.getLatestTelemetryByUserId(memberId);

		Long speed = null;
		LocationData location = null;

		if ("FULL_ACCESS".equals(privacy) || "LOCATION".equals(privacy))
		{
			speed = rawData.speed().orElse(null);
			location = rawData.location().orElse(null);
		}

		return new FamilyMemberStatus(
				memberId,
				user.getUsername(),
				user.getEmail(),
				rawData.dangers().contains(Dangers.CRASH_DETECTED),
				location,
				speed,
				rawData.battery().map(Double::intValue).orElse(null),
				privacy
		);
	}

	public void addMutualGuardiansByEmail(Long myId, String guardianEmail, String privacyLevel)
	{
		User theOtherPerson = userRepo.findByEmail(guardianEmail)
									  .orElseThrow(() -> new IllegalArgumentException("No user found with email: " + guardianEmail));

		safetyRepo.insertOrUpdatePermission(myId, theOtherPerson.getId(), privacyLevel);

		safetyRepo.insertOrUpdatePermission(theOtherPerson.getId(), myId, privacyLevel);
	}
}