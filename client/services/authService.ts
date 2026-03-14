export type AuthRequest = {
  email: string;
  password: string;
  username: string;
  firstName: string;
  familyName: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthUser = {
  userId: number;
  email: string;
  username: string;
  firstName: string;
  familyName: string;
};

export type AuthResponse = {
  userId: number;
  email: string;
  username: string;
  firstName: string;
  familyName: string;
  token: string;
  message?: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://server.g8row.xyz';

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiService {
  constructor(private readonly baseUrl: string = API_BASE_URL) {}

  private buildUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private async request<TResponse>(
    path: string,
    init: RequestInit,
  ): Promise<TResponse> {
    const response = await fetch(this.buildUrl(path), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Ignore JSON parsing errors for empty/non-JSON responses.
    }

    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof payload.message === 'string'
          ? payload.message
          : `Request failed with status ${response.status}`;

      throw new ApiError(response.status, message);
    }

    return payload as TResponse;
  }

  private post<TResponse>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<TResponse> {
    return this.request<TResponse>(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  register(request: AuthRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/users/register', request);
  }

  login(request: LoginRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/users/login', request);
  }
}

export const apiService = new ApiService();

export { ApiError };