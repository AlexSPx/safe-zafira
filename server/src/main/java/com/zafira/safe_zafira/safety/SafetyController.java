package com.zafira.safe_zafira.safety;

import com.zafira.safe_zafira.safety.model.FamilyMemberStatus;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/guardian")
@AllArgsConstructor
public class SafetyController
{

	private final GuardianService guardianService;

	@GetMapping("/dashboard/{myId}")
	public ResponseEntity<List<FamilyMemberStatus>> getDashboard(@PathVariable Long myId)
	{
		List<FamilyMemberStatus> dashboard = guardianService.getFamilyDashboard(myId);
		return ResponseEntity.ok(dashboard);
	}

	@PostMapping("/{myId}/add-by-email")
	public ResponseEntity<String> addGuardian(
			@PathVariable Long myId,
			@RequestParam String email,
			@RequestParam String privacyLevel)
	{
		try
		{
			guardianService.addMutualGuardiansByEmail(myId, email, privacyLevel);
			return ResponseEntity.ok("Guardian linked successfully!");
		}
		catch (IllegalArgumentException e)
		{
			return ResponseEntity.badRequest().body(e.getMessage());
		}
		catch (Exception e)
		{
			return ResponseEntity.internalServerError().body("Database error: " + e.getMessage());
		}
	}
}