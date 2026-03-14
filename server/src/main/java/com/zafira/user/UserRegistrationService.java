package com.zafira.user;

import com.zafira.user.exceptions.UserAlreadyExistsException;
import org.mindrot.jbcrypt.BCrypt;

import java.util.logging.Logger;

public class UserRegistrationService
{

	private final Logger logger = Logger.getLogger(UserRegistrationService.class.getName());
	private final UserRepository userRepository;

	public UserRegistrationService(UserRepository userRepository)
	{
		this.userRepository = userRepository;
	}

	public long registerUser(String email, String plainTextPassword) throws UserAlreadyExistsException
	{
		logger.info("Attempting to register user: " + email);

		if (userRepository.findByEmail(email).isPresent())
		{
			logger.severe("Registration failed: User " + email + " already exists.");
			throw new UserAlreadyExistsException("User with email " + email + " already exists.");
		}

		String hashedPassword = BCrypt.hashpw(plainTextPassword, BCrypt.gensalt(12));

		long newUserId = userRepository.save(email, hashedPassword);
		logger.info("Successfully registered user: " + email + " with ID: " + newUserId);

		return newUserId;
	}
}