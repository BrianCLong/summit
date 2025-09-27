import type {
  Alert,
  ConsentContract,
  HealthResponse,
  PdaEvent,
  RuleUpdate,
  Verdict,
} from './types';

export interface PdaClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export class PdaClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: PdaClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.defaultHeaders = options.defaultHeaders ?? { 'Content-Type': 'application/json' };
  }

  async submitEvent(event: PdaEvent): Promise<Verdict> {
    const response = await this.fetch('/api/v1/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
    return (await response.json()) as Verdict;
  }

  async getAlerts(): Promise<Alert[]> {
    const response = await this.fetch('/api/v1/alerts');
    return (await response.json()) as Alert[];
  }

  async explain(eventId: string): Promise<Alert['verdict']['trace']> {
    const response = await this.fetch(`/api/v1/explain?eventId=${encodeURIComponent(eventId)}`);
    return (await response.json()) as Alert['verdict']['trace'];
  }

  async getContracts(): Promise<ConsentContract[]> {
    const response = await this.fetch('/api/v1/contracts');
    return (await response.json()) as ConsentContract[];
  }

  async replaceContracts(contracts: ConsentContract[]): Promise<void> {
    await this.fetch('/api/v1/contracts', {
      method: 'POST',
      body: JSON.stringify(contracts),
    });
  }

  async pushRuleStream(updates: RuleUpdate[]): Promise<void> {
    const payload = updates.map((update) => JSON.stringify(update)).join('\n');
    await this.fetch('/api/v1/rules/stream', {
      method: 'POST',
      headers: { ...this.defaultHeaders, 'Content-Type': 'application/x-ndjson' },
      body: payload,
    });
  }

  async health(): Promise<HealthResponse> {
    const response = await this.fetch('/api/v1/health');
    return (await response.json()) as HealthResponse;
  }

  private fetch(path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = { ...this.defaultHeaders, ...(init?.headers as Record<string, string> | undefined) };
    return this.fetchImpl(url, { ...init, headers });
  }
}

