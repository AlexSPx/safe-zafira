package com.zafira.user;

import com.zafira.user.exceptions.UserDoesntExistException;
import com.zafira.user.exceptions.WrongPasswordException;
import com.zafira.user.model.User;
import org.mindrot.jbcrypt.BCrypt;

import java.util.Optional;
import java.util.logging.Logger;

public class UserLoginService
{

	private final Logger logger = Logger.getLogger(UserLoginService.class.getName());
	private final UserRepository userRepository;

	public UserLoginService(UserRepository userRepository)
	{
		this.userRepository = userRepository;
	}

	public long loginUser(String email, String plainTextPassword) throws UserDoesntExistException, WrongPasswordException
	{
		logger.info("Attempting to log in user: " + email);

		Optional<User> optionalUser = userRepository.findByEmail(email);

		if (optionalUser.isEmpty())
		{
			logger.severe("Login failed: User " + email + " does not exist.");
			throw new UserDoesntExistException("User " + email + " doesn't exist");
		}

		User user = optionalUser.get();

		boolean passwordMatches = BCrypt.checkpw(plainTextPassword, user.getPasswordHash());

		if (!passwordMatches)
		{
			logger.severe("Login failed: Wrong password for user " + email);
			throw new WrongPasswordException("Invalid password for user " + email);
		}

		logger.info("Successfully logged in user: " + email);
		return user.getId();
	}
}