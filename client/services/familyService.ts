import { getAuthStore } from '../stores/authStore';

export type GuardedMemberSummary = {
  id: number;
  username: string;
  familyName: string;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://server.g8row.xyz';

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class FamilyApiService {
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

  private async request<TResponse>(
    path: string,
    init: RequestInit,
  ): Promise<TResponse> {
    const response = await fetch(this.buildUrl(path), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...this.getAuthHeaders(),
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
        typeof (payload as { message: string }).message === 'string'
          ? (payload as { message: string }).message
          : `Request failed with status ${response.status}`;
      throw new ApiError(response.status, message);
    }

    return payload as TResponse;
  }

  private get<TResponse>(path: string): Promise<TResponse> {
    return this.request<TResponse>(path, { method: 'GET' });
  }

  getFamilyDashboard(myId: number): Promise<GuardedMemberSummary[]> {
    return this.get<GuardedMemberSummary[]>(`/api/family/all/${myId}`);
  }

  async addGuardianByEmail(
    myId: number,
    email: string,
    privacyLevel: string,
  ): Promise<string> {
    const query = new URLSearchParams({ email, privacyLevel }).toString();
    const response = await fetch(
      `${this.buildUrl(`/api/family/${myId}/add-by-email`)}?${query}`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      },
    );
    const text = await response.text();
    if (!response.ok) {
      throw new ApiError(
        response.status,
        text || `Request failed with status ${response.status}`,
      );
    }
    return text;
  }
}

export const familyService = new FamilyApiService();
export { ApiError };
