package com.zafira.safe_zafira.user.model;

public class User
{

	private final long id;
	private final String email;
	private final String passwordHash;
	private final String username;
	private final String firstName;
	private final String familyName;

	public User(long id, String email, String passwordHash, String username, String firstName, String familyName)
	{
		this.id = id;
		this.email = email;
		this.passwordHash = passwordHash;
		this.username = username;
		this.firstName = firstName;
		this.familyName = familyName;
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

	public String getUsername()
	{
		return username;
	}

	public String getFirstName()
	{
		return firstName;
	}

	public String getFamilyName()
	{
		return familyName;
	}
}