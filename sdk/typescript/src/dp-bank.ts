export interface RegisterKeyRequest {
  keyId: string;
  publicKey: string;
}

export interface GrantPayload {
  tenantId: string;
  projectId: string;
  keyId: string;
  epsilon: number;
  delta: number;
  nonce: string;
  issuedAt: number;
}

export interface SignedGrant {
  payload: GrantPayload;
  signature: string;
}

export interface SpendRequest {
  epsilon: number;
  delta: number;
  queryId?: string;
  note?: string;
}

export interface BudgetAccountSummary {
  tenantId: string;
  projectId: string;
  allocatedEpsilon: number;
  allocatedDelta: number;
  spentEpsilon: number;
  spentDelta: number;
  remainingEpsilon: number;
  remainingDelta: number;
}

interface RawBudgetAccountSummary {
  tenant_id: string;
  project_id: string;
  allocated_epsilon: number;
  allocated_delta: number;
  spent_epsilon: number;
  spent_delta: number;
  remaining_epsilon: number;
  remaining_delta: number;
}

export interface DpStep {
  epsilon: number;
  delta: number;
}

export interface AdvancedCompositionRequest {
  steps: DpStep[];
  deltaPrime: number;
}

export interface AdvancedCompositionResponse {
  epsilon: number;
  delta: number;
}

export interface ZcdpCompositionRequest {
  rhos: number[];
  delta: number;
}

export interface ZcdpCompositionResponse {
  epsilon: number;
  delta: number;
  rho: number;
}

export interface PlannerQuery {
  name: string;
  sensitivity: number;
  targetError: number;
}

export interface PlannerRequest {
  totalBudget?: number;
  queries: PlannerQuery[];
}

export interface PlannerAllocation {
  name: string;
  epsilon: number;
  achievedError: number;
}

export interface PlannerResponse {
  totalEpsilon: number;
  allocations: PlannerAllocation[];
}

interface RawPlannerAllocation {
  name: string;
  epsilon: number;
  achieved_error: number;
}

interface RawPlannerResponse {
  total_epsilon: number;
  allocations: RawPlannerAllocation[];
}

export type Fetcher = typeof fetch;

export class DpBankClient {
  private readonly headers: HeadersInit;
  private readonly fetchImpl: Fetcher;

  constructor(
    private readonly baseUrl: string,
    options: { headers?: HeadersInit; fetch?: Fetcher } = {},
  ) {
    this.headers = options.headers ?? {};
    this.fetchImpl = options.fetch ?? fetch;
  }

  async registerKey(tenant: string, request: RegisterKeyRequest): Promise<void> {
    await this.jsonRequest(`/tenants/${encodeURIComponent(tenant)}/keys`, {
      method: 'POST',
      body: JSON.stringify({
        key_id: request.keyId,
        public_key: request.publicKey,
      }),
    });
  }

  async applyGrant(
    tenant: string,
    project: string,
    grant: SignedGrant,
  ): Promise<BudgetAccountSummary> {
    const raw = await this.jsonRequest<RawBudgetAccountSummary>(
      `/tenants/${encodeURIComponent(tenant)}/projects/${encodeURIComponent(project)}/grants`,
      {
        method: 'POST',
        body: JSON.stringify({
          payload: {
          tenant_id: grant.payload.tenantId,
          project_id: grant.payload.projectId,
          key_id: grant.payload.keyId,
          epsilon: grant.payload.epsilon,
          delta: grant.payload.delta,
          nonce: grant.payload.nonce,
          issued_at: grant.payload.issuedAt,
        },
        signature: grant.signature,
      }),
      },
    );
    return this.mapBudgetSummary(raw);
  }

  async recordSpend(
    tenant: string,
    project: string,
    spend: SpendRequest,
  ): Promise<BudgetAccountSummary> {
    const raw = await this.jsonRequest<RawBudgetAccountSummary>(
      `/tenants/${encodeURIComponent(tenant)}/projects/${encodeURIComponent(project)}/spend`,
      {
        method: 'POST',
        body: JSON.stringify({
          epsilon: spend.epsilon,
          delta: spend.delta,
          query_id: spend.queryId,
          note: spend.note,
        }),
      },
    );
    return this.mapBudgetSummary(raw);
  }

  async getAccount(tenant: string, project: string): Promise<BudgetAccountSummary> {
    const raw = await this.jsonRequest<RawBudgetAccountSummary>(
      `/tenants/${encodeURIComponent(tenant)}/projects/${encodeURIComponent(project)}`,
    );
    return this.mapBudgetSummary(raw);
  }

  async advancedComposition(request: AdvancedCompositionRequest): Promise<AdvancedCompositionResponse> {
    return this.jsonRequest('/compose/advanced', {
      method: 'POST',
      body: JSON.stringify({
        steps: request.steps.map((step) => ({ epsilon: step.epsilon, delta: step.delta })),
        delta_prime: request.deltaPrime,
      }),
    });
  }

  async zcdpComposition(request: ZcdpCompositionRequest): Promise<ZcdpCompositionResponse> {
    return this.jsonRequest('/compose/zcdp', {
      method: 'POST',
      body: JSON.stringify({ rhos: request.rhos, delta: request.delta }),
    });
  }

  async planAllocations(request: PlannerRequest): Promise<PlannerResponse> {
    const raw = await this.jsonRequest<RawPlannerResponse>('/planner', {
      method: 'POST',
      body: JSON.stringify({
        total_budget: request.totalBudget,
        queries: request.queries.map((query) => ({
          name: query.name,
          sensitivity: query.sensitivity,
          target_error: query.targetError,
        })),
      }),
    });
    return this.mapPlannerResponse(raw);
  }

  async exportAudit(format: 'csv' | 'json'): Promise<string> {
    const path = format === 'csv' ? '/audit.csv' : '/audit.json';
    return this.textRequest(path);
  }

  private async jsonRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.performFetch(path, {
      headers: {
        'content-type': 'application/json',
        ...this.headers,
        ...init.headers,
      },
      ...init,
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but received ${contentType || 'unknown content type'}`);
    }
    return (await response.json()) as T;
  }

  private async textRequest(path: string, init: RequestInit = {}): Promise<string> {
    const response = await this.performFetch(path, {
      headers: {
        ...this.headers,
        ...init.headers,
      },
      ...init,
    });
    return await response.text();
  }

  private async performFetch(path: string, init: RequestInit): Promise<Response> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
    });
    if (!response.ok) {
      const message = await this.extractError(response);
      throw new Error(message);
    }
    return response;
  }

  private async extractError(response: Response): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        const body = await response.json();
        if (typeof body === 'object' && body !== null && 'error' in body) {
          return String((body as Record<string, unknown>).error);
        }
        return JSON.stringify(body);
      } catch (error) {
        return `HTTP ${response.status} ${response.statusText}`;
      }
    }
    return await response.text();
  }

  private mapBudgetSummary(raw: RawBudgetAccountSummary): BudgetAccountSummary {
    return {
      tenantId: raw.tenant_id,
      projectId: raw.project_id,
      allocatedEpsilon: raw.allocated_epsilon,
      allocatedDelta: raw.allocated_delta,
      spentEpsilon: raw.spent_epsilon,
      spentDelta: raw.spent_delta,
      remainingEpsilon: raw.remaining_epsilon,
      remainingDelta: raw.remaining_delta,
    };
  }

  private mapPlannerResponse(raw: RawPlannerResponse): PlannerResponse {
    return {
      totalEpsilon: raw.total_epsilon,
      allocations: raw.allocations.map((allocation) => ({
        name: allocation.name,
        epsilon: allocation.epsilon,
        achievedError: allocation.achieved_error,
      })),
    };
  }
}
