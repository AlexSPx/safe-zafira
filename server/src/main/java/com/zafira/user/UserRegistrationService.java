package com.zafira.user;

import com.zafira.user.exceptions.UserAlreadyExistsException;
import lombok.extern.slf4j.Slf4j;
import org.mindrot.jbcrypt.BCrypt;

@Slf4j
public class UserRegistrationService
{
	private final UserRepository userRepository;

	public UserRegistrationService(UserRepository userRepository)
	{
		this.userRepository = userRepository;
	}

	public long registerUser(String email, String plainTextPassword) throws UserAlreadyExistsException
	{
		log.info("Attempting to register user: {}", email);

		if (userRepository.findByEmail(email).isPresent())
		{
			log.error("Registration failed: User {} already exists.", email);
			throw new UserAlreadyExistsException("User with email " + email + " already exists.");
		}

		String hashedPassword = BCrypt.hashpw(plainTextPassword, BCrypt.gensalt(12));

		long newUserId = userRepository.save(email, hashedPassword);
		log.info("Successfully registered user: {} with ID: {}", email, newUserId);

		return newUserId;
	}
}