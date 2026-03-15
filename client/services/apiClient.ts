import { getAuthStore } from '../stores/authStore';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://server.g8row.xyz';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(private readonly baseUrl: string = API_BASE_URL) {}

  private buildUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private getAuthHeaders(): Record<string, string> {
    const { jwt } = getAuthStore();
    if (!jwt) {
      throw new ApiError(401, 'Not authenticated');
    }
    return {
      Authorization: `Bearer ${jwt}`,
    };
  }

  public async request<TResponse>(
    path: string,
    init: RequestInit,
    requireAuth: boolean = true,
  ): Promise<TResponse> {
    const url = this.buildUrl(path);
    const method = init.method ?? 'GET';

    const defaultHeaders: Record<string, string> = {
      Accept: 'application/json',
    };

    if (requireAuth) {
      Object.assign(defaultHeaders, this.getAuthHeaders());
    }

    const headers = {
      ...defaultHeaders,
      ...(init.headers ?? {}),
    };

    // console.log("Request: ", method, headers);

    const response = await fetch(url, {
      ...init,
      headers,
    });

    let payload: unknown = null;
    const contentType = response.headers.get('content-type');
    try {
      if (contentType && contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        payload = await response.text();
        if (payload === '') payload = null;
      }
    } catch {
      // Ignore parsing errors for empty/non-JSON responses.
    }

    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof (payload as { message: string }).message === 'string'
          ? (payload as { message: string }).message
          : typeof payload === 'string' && payload.trim().length > 0
            ? payload
            : `Request failed with status ${response.status}`;

      throw new ApiError(
        response.status,
        `${method} ${path} failed with status ${response.status}: ${message}`,
      );
    }

    return payload as TResponse;
  }

  public get<TResponse>(
    path: string,
    headers?: Record<string, string>,
    requireAuth: boolean = true,
  ): Promise<TResponse> {
    return this.request<TResponse>(
      path,
      { method: 'GET', headers },
      requireAuth,
    );
  }

  public post<TResponse>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
    requireAuth: boolean = true,
  ): Promise<TResponse> {
    return this.request<TResponse>(
      path,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
      requireAuth,
    );
  }
}

export const apiClient = new ApiClient();
