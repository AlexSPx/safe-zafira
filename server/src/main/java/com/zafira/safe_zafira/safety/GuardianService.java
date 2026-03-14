package com.zafira.safe_zafira.safety;

import com.zafira.safe_zafira.model.Dangers;
import com.zafira.safe_zafira.user.UserRepository;
import com.zafira.safe_zafira.user.model.User;
import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.safe_zafira.safety.model.FamilyMemberStatus;
import com.zafira.safe_zafira.vehicle.repository.VehicleRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
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
		List<Map<String, Object>> permissions = safetyRepo.getPermissionsWhereIWatch(myId);

		List<FamilyMemberStatus> dashboard = new ArrayList<>();

		for (Map<String, Object> row : permissions)
		{
			Long ownerId = (Long) row.get("owner_id");
			String privacy = (String) row.get("privacy_level");

			Optional<User> userOpt = userRepo.findById(ownerId);
			if (userOpt.isEmpty())
			{
				continue;
			}

			User user = userOpt.get();

			VehicleData rawData = vehicleRepo.getLatestTelemetryByUserId(ownerId);

			dashboard.add(new FamilyMemberStatus(
					ownerId,
					"Name Pending",
					user.getEmail(),
					rawData.dangers().contains(Dangers.CRASH_DETECTED),
					rawData.location().orElse(null),
					"FULL_ACCESS".equals(privacy) ? rawData.speed().orElse(null) : null,
					rawData.battery().map(Double::intValue).orElse(null),
					privacy
			));
		}

		return dashboard;
	}

	public void addGuardianByEmail(Long myId, String guardianEmail, String privacyLevel)
	{
		User watcher = userRepo.findByEmail(guardianEmail)
							   .orElseThrow(() -> new IllegalArgumentException("No user found with email: " + guardianEmail));
		safetyRepo.insertPermission(myId, watcher.getId(), privacyLevel);
	}
}