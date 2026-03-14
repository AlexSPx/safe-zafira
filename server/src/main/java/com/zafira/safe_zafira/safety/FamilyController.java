package com.zafira.safe_zafira.safety;

import com.zafira.safe_zafira.safety.model.FamilyMemberStatus;
import com.zafira.safe_zafira.safety.model.GuardedMemberSummary;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/family")
@AllArgsConstructor
@Slf4j
public class FamilyController
{

	private final FamilyService familyService;

	@GetMapping("/all/{myId}")
	public ResponseEntity<List<GuardedMemberSummary>> getDashboard(@PathVariable Long myId)
	{
		List<GuardedMemberSummary> dashboard = familyService.getFamilyDashboard(myId);
		return ResponseEntity.ok(dashboard);
	}

	@GetMapping("/{myId}/member/{memberId}")
	public ResponseEntity<FamilyMemberStatus> getMemberStatus(
			@PathVariable Long myId,
			@PathVariable Long memberId)
	{
		try
		{
			FamilyMemberStatus status = familyService.getMemberStatus(myId, memberId);
			return ResponseEntity.ok(status);
		}
		catch (IllegalArgumentException e)
		{
			log.error("Error fetching member status: " + e.getMessage());
			return ResponseEntity.badRequest().build();
		}
	}

	@PostMapping("/{myId}/add-by-email")
	public ResponseEntity<String> addGuardian(
			@PathVariable Long myId,
			@RequestParam String email,
			@RequestParam String privacyLevel)
	{
		try
		{
			familyService.addMutualGuardiansByEmail(myId, email, privacyLevel);
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