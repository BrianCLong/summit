import { fetch as undiciFetch } from 'undici';

export type ConsistencyMode = 'strong' | 'bounded-staleness' | 'read-my-writes';

export interface PolicyTags {
  dataClass: string;
  purpose: string;
  jurisdiction: string;
}

export interface PlanRequest extends PolicyTags {
  id?: string;
  operation: 'read' | 'write';
  session?: string;
  metadata?: Record<string, unknown>;
}

export interface ExplainStep {
  stage: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ReplicaTarget {
  name: string;
  region: string;
  role: string;
  latencyMs: number;
  stalenessMs: number;
  isQuorum: boolean;
  isPrimary: boolean;
  syncRequired: boolean;
}

export interface RoutePlan {
  quorum: string[];
  replicas: ReplicaTarget[];
  estimatedLatencyMs: number;
  consistencyScore: number;
  boundedStalenessSla: number;
  fallbackToStrongMode?: boolean;
}

export interface PlanResponse {
  mode: ConsistencyMode;
  stalenessSlaMs: number;
  route: RoutePlan;
  explain: ExplainStep[];
}

export interface ReplicaMetricsUpdate {
  name: string;
  latencyMs: number;
  stalenessMs: number;
}

export interface PlanOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface ClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

const JSON_HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json'
} as const;

export class ACCClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: ClientOptions) {
    if (!options?.baseUrl) {
      throw new Error('ACCClient requires a baseUrl');
    }
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch ?? undiciFetch);
    this.defaultHeaders = { ...JSON_HEADERS, ...(options.defaultHeaders ?? {}) };
  }

  async plan(request: PlanRequest, options: PlanOptions = {}): Promise<PlanResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}/plan`, {
      method: 'POST',
      body: JSON.stringify(request),
      headers: { ...this.defaultHeaders, ...(options.headers ?? {}) },
      signal: options.signal
    });

    if (!response.ok) {
      const message = await safeText(response);
      throw new Error(`ACC plan failed (${response.status}): ${message}`);
    }

    return (await response.json()) as PlanResponse;
  }

  async updateReplicaMetrics(update: ReplicaMetricsUpdate, options: PlanOptions = {}): Promise<void> {
    const response = await this.fetchImpl(`${this.baseUrl}/replica`, {
      method: 'POST',
      body: JSON.stringify(update),
      headers: { ...this.defaultHeaders, ...(options.headers ?? {}) },
      signal: options.signal
    });

    if (!response.ok) {
      const message = await safeText(response);
      throw new Error(`ACC replica update failed (${response.status}): ${message}`);
    }
  }

  formatExplain(plan: PlanResponse): string {
    return plan.explain
      .map((step, idx) => {
        const meta = step.meta ? ` ${JSON.stringify(step.meta)}` : '';
        return `${idx + 1}. [${step.stage}] ${step.message}${meta}`;
      })
      .join('\n');
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch (err) {
    return (err as Error).message;
  }
}

export function withPolicyTags<T extends Record<string, unknown>>(request: T, tags: PolicyTags): T & {
  'x-acc-data-class': string;
  'x-acc-purpose': string;
  'x-acc-jurisdiction': string;
} {
  return {
    ...request,
    'x-acc-data-class': tags.dataClass,
    'x-acc-purpose': tags.purpose,
    'x-acc-jurisdiction': tags.jurisdiction
  };
}

export function explainSummary(plan: PlanResponse): string {
  const steps = plan.explain.map((step) => step.stage);
  return `${plan.mode} via ${steps.join(' -> ')}`;
}
