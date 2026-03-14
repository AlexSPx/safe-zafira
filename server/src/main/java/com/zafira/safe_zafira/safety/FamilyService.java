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
public class FamilyService
{

	private final SafetyRepository safetyRepo;
	private final UserRepository userRepo;

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

	public void addMutualGuardiansByEmail(Long myId, String guardianEmail, String privacyLevel)
	{
		User theOtherPerson = userRepo.findByEmail(guardianEmail)
									  .orElseThrow(() -> new IllegalArgumentException("No user found with email: " + guardianEmail));

		safetyRepo.insertOrUpdatePermission(myId, theOtherPerson.getId(), privacyLevel);

		safetyRepo.insertOrUpdatePermission(theOtherPerson.getId(), myId, privacyLevel);
	}
}