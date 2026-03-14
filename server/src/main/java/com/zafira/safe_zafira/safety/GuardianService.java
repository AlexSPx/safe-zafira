package com.zafira.safe_zafira.safety;

import com.zafira.safe_zafira.model.VehicleData;
import com.zafira.safe_zafira.safety.model.FamilyMemberStatus;
import com.zafira.safe_zafira.vehicle.repository.VehicleRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

@Service
@AllArgsConstructor
public class GuardianService
{

	private final SafetyRepository safetyRepo;
	private final VehicleRepository vehicleRepo;

	public List<FamilyMemberStatus> getFamilyDashboard(Long myId) throws SQLException
	{
		List<Map<String, Object>> connections = safetyRepo.getPeopleIWatch(myId);

		return connections.stream().map(row -> {
			Long ownerId = (Long) row.get("id");
			String privacy = (String) row.get("privacy_level");

			VehicleData rawData = vehicleRepo.getLatestTelemetryByUserId(ownerId);

			return new FamilyMemberStatus(
					ownerId,
					(String) row.get("full_name"),
					(String) row.get("email"),
					rawData.isCrashed().orElse(false),
					rawData.location().orElse(null),
					"FULL_ACCESS".equals(privacy) ? rawData.speed().orElse(null) : null,
					rawData.battery().orElse(null),
					privacy
			);
		}).toList();
	}
}