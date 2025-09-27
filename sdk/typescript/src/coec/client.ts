export interface CohortConfig {
  name: string;
  fraction: number;
}

export interface MetricDefinition {
  name: string;
  aggregation: 'sum' | 'mean';
  sensitivity: number;
  description?: string;
  lowerIsBetter?: boolean;
}

export interface EligibilityRule {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  value: unknown;
}

export interface EligibilityFilter {
  all?: EligibilityRule[];
  any?: EligibilityRule[];
}

export interface OrgRegistration {
  orgId: string;
}

export interface DPConfig {
  epsilon: number;
  delta: number;
  sensitivity: number;
}

export interface ExperimentConfig {
  id?: string;
  description?: string;
  vrfKey?: string;
  cohorts: CohortConfig[];
  eligibilityFilter?: EligibilityFilter;
  metrics: MetricDefinition[];
  dpConfig?: DPConfig;
  organisations: OrgRegistration[];
}

export interface ExperimentRegistrationResponse {
  experiment: ExperimentConfig;
  vrfKey: string;
  publicKeys: Record<string, string>;
}

export interface AssignmentResponse {
  cohort: string;
  vrf: { value: string; proof: string };
}

export interface PreregistrationPayload {
  orgId: string;
  payload: Record<string, unknown>;
}

export interface SamplingCertificateRequest {
  orgId: string;
  cohort: string;
  sampleSize: number;
  seed: string;
}

export interface MetricSubmission {
  orgId: string;
  cohort: string;
  mask: number;
  count: number;
  metrics: Record<string, number>;
}

export interface MetricResult {
  value: number;
  noiseApplied: boolean;
  stdError: number;
  aggregation: string;
}

export interface CohortResult {
  metrics: Record<string, MetricResult>;
  count: number;
}

export interface OrgResult {
  orgId: string;
  cohorts: Record<string, CohortResult>;
  dpConfig?: DPConfig;
}

export interface SamplingCertificate extends SamplingCertificateRequest {
  experimentId: string;
  digest: string;
  issuedAt: string;
}

export interface ResultBrief {
  experimentId: string;
  orgId: string;
  results: OrgResult;
  certificates: SamplingCertificate[];
  preregistrations: PreregistrationPayload[];
  signedAt: string;
  signature: string;
  publicKey: string;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class CoecClient {
  private readonly fetcher: Fetcher;

  constructor(private readonly baseUrl: string, fetcher?: Fetcher) {
    this.fetcher = fetcher ?? (globalThis.fetch as Fetcher);
    if (!this.fetcher) {
      throw new Error('Fetch implementation is required for CoecClient');
    }
  }

  async registerExperiment(config: ExperimentConfig): Promise<ExperimentRegistrationResponse> {
    return this.post<ExperimentRegistrationResponse>('/experiments', config);
  }

  async assignCohort(id: string, subjectId: string, attributes: Record<string, unknown> = {}): Promise<AssignmentResponse> {
    const payload = { subjectId, attributes };
    return this.post<AssignmentResponse>(`/experiments/${id}/assign`, payload);
  }

  async recordPreregistration(id: string, prereg: PreregistrationPayload): Promise<PreregistrationPayload & { createdAt: string }> {
    return this.post(`/experiments/${id}/preregister`, prereg);
  }

  async issueSamplingCertificate(id: string, request: SamplingCertificateRequest): Promise<SamplingCertificate> {
    return this.post(`/experiments/${id}/samples`, request);
  }

  async submitMetrics(id: string, submission: MetricSubmission): Promise<void> {
    await this.post<void>(`/experiments/${id}/metrics`, submission, true);
  }

  async finalise(id: string): Promise<ResultBrief[]> {
    return this.post<ResultBrief[]>(`/experiments/${id}/finalise`, {});
  }

  async getBrief(id: string, orgId: string): Promise<ResultBrief> {
    return this.get<ResultBrief>(`/experiments/${id}/briefs/${orgId}`);
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetcher(this.resolve(path));
    return this.parse<T>(response);
  }

  private async post<T>(path: string, body: unknown, expectEmpty = false): Promise<T> {
    const response = await this.fetcher(this.resolve(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (expectEmpty) {
      if (!response.ok) {
        await this.raise(response);
      }
      return undefined as T;
    }
    return this.parse<T>(response);
  }

  private resolve(path: string): string {
    return new URL(path, this.baseUrl).toString();
  }

  private async parse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      await this.raise(response);
    }
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  private async raise(response: Response): Promise<never> {
    let message = response.statusText || 'Request failed';
    try {
      const body = await response.json();
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // ignore
    }
    throw new Error(`COEC request failed (${response.status}): ${message}`);
  }
}
