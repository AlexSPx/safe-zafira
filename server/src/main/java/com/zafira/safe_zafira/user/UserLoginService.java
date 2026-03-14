package com.zafira.safe_zafira.user;

import com.zafira.safe_zafira.user.exceptions.UserDoesntExistException;
import com.zafira.safe_zafira.user.exceptions.WrongPasswordException;
import com.zafira.safe_zafira.user.model.User;
import lombok.extern.slf4j.Slf4j;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
public class UserLoginService
{

	private final UserRepository userRepository;

	public UserLoginService(UserRepository userRepository)
	{
		this.userRepository = userRepository;
	}

	public long loginUser(String email, String plainTextPassword) throws UserDoesntExistException, WrongPasswordException
	{
		log.info("Attempting to log in user: {}", email);

		Optional<User> optionalUser = userRepository.findByEmail(email);

		if (optionalUser.isEmpty())
		{
			log.error("Login failed: User {} does not exist.", email);
			throw new UserDoesntExistException("User " + email + " doesn't exist");
		}

		User user = optionalUser.get();

		boolean passwordMatches = BCrypt.checkpw(plainTextPassword, user.getPasswordHash());

		if (!passwordMatches)
		{
			log.error("Login failed: Wrong password for user {}", email);
			throw new WrongPasswordException("Invalid password for user " + email);
		}

		log.info("Successfully logged in user: {}", email);
		return user.getId();
	}
}