package com.zafira.user.exceptions;

public class UserDoesntExistException extends Exception
{

	public UserDoesntExistException(String message)
	{
		super(message);
	}
}
