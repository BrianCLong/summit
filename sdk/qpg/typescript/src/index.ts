export interface TokenizeRequest {
  tenant: string;
  purpose: string;
  payload: Record<string, unknown>;
}

export interface TokenizeResponse {
  payload: Record<string, unknown>;
}

export interface RevealRequest {
  tenant: string;
  purpose: string;
  field: string;
  token: string;
  shares: string[];
}

export class QpgClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(baseUrl: string, fetcher?: typeof fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetcher = fetcher ?? globalThis.fetch;
    if (!this.fetcher) {
      throw new Error("fetch is not available; provide a fetch implementation");
    }
  }

  async tokenize(request: TokenizeRequest): Promise<TokenizeResponse> {
    const response = await this.fetcher(`${this.baseUrl}/tokenize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`tokenize failed with status ${response.status}`);
    }
    return (await response.json()) as TokenizeResponse;
  }

  async reveal(request: RevealRequest): Promise<string> {
    const response = await this.fetcher(`${this.baseUrl}/reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`reveal failed with status ${response.status}`);
    }
    const payload = (await response.json()) as { value: string };
    return payload.value;
  }
}
