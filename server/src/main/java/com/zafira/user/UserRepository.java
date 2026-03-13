package com.zafira.user;

import com.zafira.user.model.User;

import java.util.Optional;

public class UserRepository
{

	public Optional<Long> findByEmail(String email)
	{
		return Optional.empty();
	}

	public long save(User user)
	{
		return -1;
	}

	public Optional<User> findById(long id)
	{
		return Optional.empty();
	}
}
