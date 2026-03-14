package com.zafira.user;

import com.zafira.user.model.User;

import java.util.Optional;

public class UserRepository
{

	public Optional<User> findByEmail(String email)
	{
		return Optional.empty();
	}

	public long save(String email, String password)
	{
		return -1;
	}

	public Optional<User> findById(long id)
	{
		return Optional.empty();
	}
}
