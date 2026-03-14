package com.zafira.safe_zafira.user.model;

public class User
{

	private final long id;
	private final String email;
	private final String passwordHash;

	public User(long id, String email, String passwordHash)
	{
		this.id = id;
		this.email = email;
		this.passwordHash = passwordHash;
	}

	public long getId()
	{
		return id;
	}

	public String getEmail()
	{
		return email;
	}

	public String getPasswordHash()
	{
		return passwordHash;
	}
}