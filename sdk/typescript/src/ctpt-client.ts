export interface CTPTClientOptions {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export interface PlantTokenRequest {
  type: 'email' | 'file-beacon' | 'unique-phrase';
  plantedBy: string;
  sourceSystem: string;
  tags?: string[];
  ttlSeconds: number;
  metadata?: Record<string, unknown>;
}

export interface PlantTokenResponse {
  id: string;
  tokenValue: string;
  tokenType: PlantTokenRequest['type'];
  displayName: string;
  expiresAt: string;
  leakScore: number;
}

export interface CallbackEventRequest {
  tokenValue: string;
  channel: 'http-callback' | 'inbox-hit' | 'keyword-scan';
  sourceAddress?: string;
  context?: Record<string, unknown>;
}

export interface DashboardResponse {
  totals: {
    planted: number;
    active: number;
    expired: number;
  };
  tokensByType: Record<string, number>;
  topAlerts: Array<{
    tokenId: string;
    displayName: string;
    leakScore: number;
    lastSeen: string | null;
  }>;
  recentActivity: Array<{
    tokenId: string;
    callbackId: string;
    observedAt: string;
    channel: CallbackEventRequest['channel'];
    sourceAddress?: string;
  }>;
}

export class CTPTClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CTPTClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error('Fetch implementation is required');
    }
  }

  async plantToken(request: PlantTokenRequest): Promise<PlantTokenResponse> {
    const response = await this.request('/ctpt/tokens', 'POST', request);
    return (await response.json()) as PlantTokenResponse;
  }

  async recordCallback(request: CallbackEventRequest): Promise<void> {
    const response = await this.request('/ctpt/callbacks', 'POST', request);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to record callback (${response.status}): ${body}`);
    }
  }

  async getDashboard(): Promise<DashboardResponse> {
    const response = await this.request('/ctpt/dashboard', 'GET');
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch dashboard (${response.status}): ${body}`);
    }
    return (await response.json()) as DashboardResponse;
  }

  private request(path: string, method: 'GET' | 'POST', body?: unknown): Promise<Response> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (this.apiKey) {
      headers['authorization'] = `Bearer ${this.apiKey}`;
    }
    return this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}
