package com.zafira.safe_zafira.user;

import com.zafira.safe_zafira.user.exceptions.UserAlreadyExistsException;
import com.zafira.safe_zafira.user.model.User;
import lombok.extern.slf4j.Slf4j;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class UserRegistrationService
{
	private final UserRepository userRepository;

	public UserRegistrationService(UserRepository userRepository)
	{
		this.userRepository = userRepository;
	}

	public User registerUser(String email, String plainTextPassword, String username, String firstName, String familyName) throws UserAlreadyExistsException
	{
		log.info("Attempting to register user: {}", email);

		if (userRepository.findByEmail(email).isPresent())
		{
			log.error("Registration failed: User {} already exists.", email);
			throw new UserAlreadyExistsException("User with email " + email + " already exists.");
		}

		String hashedPassword = BCrypt.hashpw(plainTextPassword, BCrypt.gensalt(12));

		User createdUser = userRepository.save(email, hashedPassword, username, firstName, familyName);
		log.info("Successfully registered user: {} with ID: {}", email, createdUser.getId());

		return createdUser;
	}
}