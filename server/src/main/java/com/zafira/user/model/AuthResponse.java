package com.zafira.user.model;

public record AuthResponse(long userId, String token, String message) {}