package com.zafira.safe_zafira.safety;

import com.zafira.safe_zafira.model.Dangers;
import com.zafira.safe_zafira.safety.model.SafetyPermissionDTO;
import com.zafira.safe_zafira.user.UserRepository;
import com.zafira.safe_zafira.user.model.User;
import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.safe_zafira.model.LocationData;
import com.zafira.safe_zafira.safety.model.FamilyMemberStatus;
import com.zafira.safe_zafira.vehicle.repository.VehicleRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.ArrayList;

@Service
@AllArgsConstructor
public class GuardianService
{

	private final SafetyRepository safetyRepo;
	private final UserRepository userRepo;
	private final VehicleRepository vehicleRepo;

	public List<FamilyMemberStatus> getFamilyDashboard(Long myId)
	{
		List<SafetyPermissionDTO> permissions = safetyRepo.getDriversWatchedByMe(myId);
		List<FamilyMemberStatus> dashboard = new ArrayList<>();

		for (SafetyPermissionDTO row : permissions)
		{
			Long observedId = row.targetUserId();
			String privacy = row.privacyLevel();

			Optional<User> userOpt = userRepo.findById(observedId);
			if (userOpt.isEmpty())
			{
				continue;
			}

			User user = userOpt.get();
			VehicleData rawData = vehicleRepo.getLatestTelemetryByUserId(observedId);

			Long speed = null;
			LocationData location = null;

			if ("ALL".equals(privacy) || "LOCATION_AND_SPEED".equals(privacy))
			{
				speed = rawData.speed().orElse(null);
				location = rawData.location().orElse(null);
			}

			dashboard.add(new FamilyMemberStatus(
					observedId,
					"Name Pending",
					user.getEmail(),
					rawData.dangers().contains(Dangers.CRASH_DETECTED),
					location,
					speed,
					rawData.battery().map(Double::intValue).orElse(null),
					privacy
			));
		}

		return dashboard;
	}

	public void addMutualGuardiansByEmail(Long myId, String guardianEmail, String privacyLevel)
	{
		User theOtherPerson = userRepo.findByEmail(guardianEmail)
									  .orElseThrow(() -> new IllegalArgumentException("No user found with email: " + guardianEmail));

		safetyRepo.insertOrUpdatePermission(myId, theOtherPerson.getId(), privacyLevel);

		safetyRepo.insertOrUpdatePermission(theOtherPerson.getId(), myId, privacyLevel);
	}
}