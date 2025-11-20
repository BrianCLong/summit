
export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskResult {
  name: string;
  level: RiskLevel;
  score: number;
  reasons: string[];
}

export interface Signals {
  geo: string;
  devicePosture: string;
  anomalyScore: number;
  additional?: Record<string, unknown>;
}

export interface DecisionRequest {
  action: string;
  subject: Record<string, string>;
  resource: Record<string, string>;
  signals: Signals;
  challengeResponses?: Record<string, Record<string, string>>;
}

export interface ChallengeInfo {
  type: string;
  prompt: string;
}

export interface DecisionResponse {
  decision: 'allow' | 'deny' | 'step-up';
  policyId?: string;
  evaluationId: string;
  riskLevel: RiskLevel;
  riskBreakdown: RiskResult[];
  reasons: string[];
  requiredChallenges?: ChallengeInfo[];
}

export interface PolicyDescription {
  id: string;
  description: string;
  actions: string[];
  subject: Record<string, unknown>;
  resource: Record<string, unknown>;
  effect: string;
  allowRisk: RiskLevel;
  stepUpRisk: RiskLevel;
  stepUpChallenges?: string[];
}

export interface ScenarioRecord {
  id: string;
  name: string;
  request: DecisionRequest;
  response: DecisionResponse;
}

export interface ReplayResponse {
  match: boolean;
  decision: DecisionResponse;
}

export interface CABClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  defaultHeaders?: HeadersInit;
}

export class CABClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: HeadersInit;

  constructor(options: CABClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'http://localhost:8085';
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.defaultHeaders = options.defaultHeaders ?? { 'Content-Type': 'application/json' };
  }

  async evaluate(request: DecisionRequest): Promise<DecisionResponse> {
    return this.post<DecisionResponse>('/evaluate', request);
  }

  async listPolicies(): Promise<PolicyDescription[]> {
    return this.get<PolicyDescription[]>('/policies');
  }

  async listScenarios(): Promise<ScenarioRecord[]> {
    return this.get<ScenarioRecord[]>('/scenarios');
  }

  async saveScenario(name: string, request: DecisionRequest): Promise<ScenarioRecord> {
    return this.post<ScenarioRecord>('/scenarios', { name, request });
  }

  async replayScenario(id: string): Promise<ReplayResponse> {
    return this.post<ReplayResponse>(`/scenarios/${id}/replay`);
  }

  async completeStepUp(
    request: DecisionRequest,
    challenges: Record<string, Record<string, string>>
  ): Promise<DecisionResponse> {
    return this.evaluate({ ...request, challengeResponses: challenges });
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = this.normalize(path);
    const response = await this.fetchImpl(url, {
      headers: this.defaultHeaders,
      ...init,
    });
    if (!response.ok) {
      const message = await safeErrorMessage(response);
      throw new Error(`CAB request failed (${response.status}): ${message}`);
    }
    return (await response.json()) as T;
  }

  private normalize(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    return `${this.baseUrl}${path}`;
  }
}

async function safeErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data === 'object' && data && 'error' in data) {
      return String((data as { error: unknown }).error);
    }
    return JSON.stringify(data);
  } catch (error) {
    return response.statusText || 'unknown error';
  }
}
