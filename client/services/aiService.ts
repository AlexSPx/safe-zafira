const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://server.g8row.xyz';

const AI_API_KEY =
  process.env.EXPO_PUBLIC_AI_API_KEY ?? 'change-me-in-production';

export type DtcSuggestRequest = {
  code: string;
  description: string;
};

export type DtcSuggestResponse = {
  suggestion: string;
};

class AiApiService {
  constructor(private readonly baseUrl: string = API_BASE_URL) {}

  private buildUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  async suggestDtcFix(code: string, description: string): Promise<string> {
    const response = await fetch(this.buildUrl('/api/dtc/suggest'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_API_KEY,
      },
      body: JSON.stringify({ code, description } as DtcSuggestRequest),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
    }

    const data: DtcSuggestResponse = await response.json();
    return data.suggestion;
  }
}

export const aiService = new AiApiService();
