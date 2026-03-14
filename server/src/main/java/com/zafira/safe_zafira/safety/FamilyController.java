package com.zafira.safe_zafira.safety;

import com.zafira.safe_zafira.safety.model.FamilyMemberStatus;
import com.zafira.safe_zafira.safety.model.GuardedMemberSummary;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
	public ResponseEntity<List<GuardedMemberSummary>> getDashboard(@AuthenticationPrincipal Long myId)
	{
		if (myId == null)
		{
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

		List<GuardedMemberSummary> dashboard = familyService.getFamilyDashboard(myId);
		return ResponseEntity.ok(dashboard);
	}

	@PostMapping("/{myId}/add-by-email")
	public ResponseEntity<String> addGuardian(
			@AuthenticationPrincipal Long myId,
			@RequestParam String email,
			@RequestParam String privacyLevel)
	{
		if (myId == null)
		{
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

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