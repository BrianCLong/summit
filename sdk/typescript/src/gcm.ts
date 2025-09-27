export interface WorkloadUsage {
  cpuHours: number;
  storageGb: number;
  egressGb: number;
}

export interface JobRequest {
  jobId?: string;
  accountId: string;
  policyTier: string;
  residency: string;
  usage: WorkloadUsage;
  metadata?: Record<string, unknown>;
}

export interface ChargeBreakdown {
  components: Record<string, number>;
  total: number;
  currency: string;
}

export interface JobChargeResponse {
  jobId: string;
  accountId: string;
  policyTier: string;
  residency: string;
  usage: WorkloadUsage;
  charges: ChargeBreakdown;
  manifestId: string;
  recordedAt: string;
}

export interface GuardrailViolation {
  accountId: string;
  policyTier: string;
  residency: string;
  budgetLimit: number;
  budgetConsumed: number;
  attemptedCost: number;
  currency: string;
  requiredHeadroom: number;
  explainPath: string[];
}

export interface JobErrorResponse {
  allowed: boolean;
  reason: string;
  violation: GuardrailViolation;
}

export interface ManifestLineItem {
  policyTier: string;
  residency: string;
  usage: WorkloadUsage;
  charges: ChargeBreakdown;
}

export interface Manifest {
  manifestId: string;
  accountId: string;
  currency: string;
  generatedAt: string;
  lineItems: ManifestLineItem[];
  total: ChargeBreakdown;
  signature: string;
}

export interface ProviderUsageReport {
  accountId: string;
  policyTier: string;
  residency: string;
  usage: WorkloadUsage;
  totalCost: number;
  currency?: string;
  reportedAt?: string;
}

export interface ReconciliationDelta {
  policyTier: string;
  residency: string;
  internal: ManifestLineItem;
  provider: ProviderUsageReport;
  costDelta: number;
  withinTolerance: boolean;
}

export interface ReconciliationSummary {
  accountId: string;
  currency: string;
  tolerance: number;
  deltas: ReconciliationDelta[];
  totalDelta: number;
  withinTolerance: boolean;
  generatedAt: string;
}

export interface GCMClientOptions {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export class GCMGuardrailError extends Error {
  violation: GuardrailViolation;

  constructor(message: string, violation: GuardrailViolation) {
    super(message);
    this.name = 'GCMGuardrailError';
    this.violation = violation;
  }
}

export class GCMClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

  constructor(options: GCMClientOptions) {
    if (!options.baseUrl) {
      throw new Error('baseUrl is required');
    }
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    if (options.fetchImpl) {
      this.fetchImpl = options.fetchImpl;
    } else if (typeof fetch !== 'undefined') {
      this.fetchImpl = fetch;
    } else {
      throw new Error('fetch is not available in this environment; provide fetchImpl');
    }
  }

  async submitJob(request: JobRequest): Promise<JobChargeResponse> {
    const response = await this.request<JobChargeResponse>('/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response;
  }

  async getManifest(accountId: string): Promise<Manifest> {
    if (!accountId) {
      throw new Error('accountId is required');
    }
    return this.request<Manifest>(`/api/v1/accounts/${encodeURIComponent(accountId)}/manifest`);
  }

  async submitProviderUsage(report: ProviderUsageReport): Promise<void> {
    await this.request('/api/v1/provider-usage', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async getReconciliation(accountId: string): Promise<ReconciliationSummary> {
    if (!accountId) {
      throw new Error('accountId is required');
    }
    return this.request<ReconciliationSummary>(`/api/v1/accounts/${encodeURIComponent(accountId)}/reconciliation`);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers ?? {});
    headers.set('Content-Type', 'application/json');
    if (this.apiKey) {
      headers.set('Authorization', `Bearer ${this.apiKey}`);
    }
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
    const payload = await response.json().catch(() => ({}));

    if (response.ok) {
      return payload as T;
    }

    if (response.status === 409 && payload && (payload as JobErrorResponse).violation) {
      const violationResponse = payload as JobErrorResponse;
      throw new GCMGuardrailError(violationResponse.reason ?? 'guardrail_violation', violationResponse.violation);
    }

    const errorMessage = typeof payload?.message === 'string' ? payload.message : `request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }
}
