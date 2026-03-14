package com.zafira.safe_zafira.user;

import com.zafira.safe_zafira.jwt.JwtUtility;
import com.zafira.safe_zafira.user.exceptions.UserAlreadyExistsException;
import com.zafira.safe_zafira.user.exceptions.UserDoesntExistException;
import com.zafira.safe_zafira.user.exceptions.WrongPasswordException;
import com.zafira.safe_zafira.user.model.AuthRequest;
import com.zafira.safe_zafira.user.model.AuthResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

	private final UserRegistrationService registrationService;
	private final UserLoginService loginService;
	private final JwtUtility jwtUtility;

	public UserController(UserRegistrationService registrationService,
						  UserLoginService loginService,
						  JwtUtility jwtUtility) {
		this.registrationService = registrationService;
		this.loginService = loginService;
		this.jwtUtility = jwtUtility;
	}

	@PostMapping("/register")
	public ResponseEntity<AuthResponse> register(@RequestBody AuthRequest request) {
		try {long userId = registrationService.registerUser(request.email(), request.password(), request.username(), request.familyName());
			String token = jwtUtility.generateToken(userId, request.email());

			return ResponseEntity.status(HttpStatus.CREATED)
								 .body(new AuthResponse(userId, token, "Registration successful"));

		} catch (UserAlreadyExistsException e) {
			return ResponseEntity.status(HttpStatus.CONFLICT)
								 .body(new AuthResponse(-1, null, e.getMessage()));
		}
	}

	@PostMapping("/login")
	public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
		try {
			long userId = loginService.loginUser(request.email(), request.password());

			String token = jwtUtility.generateToken(userId, request.email());

			return ResponseEntity.ok(new AuthResponse(userId, token, "Login successful"));

		} catch (UserDoesntExistException | WrongPasswordException e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
								 .body(new AuthResponse(-1, null, "Invalid email or password"));
		}
	}
}