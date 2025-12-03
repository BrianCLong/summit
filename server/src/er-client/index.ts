/**
 * Lightweight Entity Resolution Client
 *
 * A typed client for consuming the ER service API
 */

export interface EntityRecord {
  id: string;
  type: string;
  name: string;
  aliases?: string[];
  attributes: Record<string, unknown>;
  tenantId: string;
  confidence?: number;
  locations?: Array<{
    lat: number;
    lon: number;
    timestamp?: string;
  }>;
  timestamps?: string[];
  deviceIds?: string[];
  accountIds?: string[];
  ipAddresses?: string[];
}

export interface CandidateRequest {
  tenantId: string;
  entity: EntityRecord;
  population: EntityRecord[];
  topK?: number;
  threshold?: number;
  method?: 'deterministic' | 'probabilistic' | 'hybrid';
  policyTags?: string[];
}

export interface CandidateScore {
  entityId: string;
  score: number;
  confidence: number;
  features: Record<string, unknown>;
  rationale: string[];
  method: string;
}

export interface CandidateResponse {
  requestId: string;
  candidates: CandidateScore[];
  method: string;
  executionTimeMs: number;
}

export interface MergeRequest {
  tenantId: string;
  entityIds: string[];
  primaryId?: string;
  actor: string;
  reason: string;
  policyTags?: string[];
  confidence?: number;
}

export interface MergeRecord {
  mergeId: string;
  tenantId: string;
  primaryId: string;
  mergedIds: string[];
  actor: string;
  reason: string;
  policyTags: string[];
  confidence?: number;
  mergedAt: string;
  reversible: boolean;
}

export interface SplitRequest {
  tenantId: string;
  entityId: string;
  splitGroups: Array<{
    attributes: Record<string, unknown>;
    deviceIds?: string[];
    accountIds?: string[];
  }>;
  actor: string;
  reason: string;
}

export interface SplitRecord {
  splitId: string;
  tenantId: string;
  originalEntityId: string;
  newEntityIds: string[];
  actor: string;
  reason: string;
  splitAt: string;
}

export interface ExplainResponse {
  mergeId: string;
  features: Record<string, unknown>;
  rationale: string[];
  featureWeights: Record<string, number>;
  threshold: number;
  policyTags: string[];
  method: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  actor: string;
  event: 'merge' | 'revert' | 'split';
  target: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ERClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Entity Resolution Client
 */
export class ERClient {
  private baseUrl: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: ERClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout || 30000;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  /**
   * Find candidate matches for an entity
   */
  async candidates(request: CandidateRequest): Promise<CandidateResponse> {
    return this.request('POST', '/candidates', request);
  }

  /**
   * Merge entities
   */
  async merge(request: MergeRequest): Promise<MergeRecord> {
    return this.request('POST', '/merge', request);
  }

  /**
   * Revert a merge
   */
  async revertMerge(mergeId: string, actor: string, reason: string): Promise<{ success: boolean; mergeId: string }> {
    return this.request('POST', `/merge/${mergeId}/revert`, { actor, reason });
  }

  /**
   * Split an entity
   */
  async split(request: SplitRequest): Promise<SplitRecord> {
    return this.request('POST', '/split', request);
  }

  /**
   * Explain a merge decision
   */
  async explain(mergeId: string): Promise<ExplainResponse> {
    return this.request('GET', `/explain/${mergeId}`);
  }

  /**
   * Get merge record
   */
  async getMerge(mergeId: string): Promise<MergeRecord> {
    return this.request('GET', `/merge/${mergeId}`);
  }

  /**
   * Get split record
   */
  async getSplit(splitId: string): Promise<SplitRecord> {
    return this.request('GET', `/split/${splitId}`);
  }

  /**
   * Get audit log
   */
  async getAuditLog(options?: {
    tenantId?: string;
    actor?: string;
    event?: 'merge' | 'revert' | 'split';
    limit?: number;
  }): Promise<{ entries: AuditEntry[]; count: number }> {
    const params = new URLSearchParams();
    if (options?.tenantId) params.append('tenantId', options.tenantId);
    if (options?.actor) params.append('actor', options.actor);
    if (options?.event) params.append('event', options.event);
    if (options?.limit) params.append('limit', options.limit.toString());

    const query = params.toString();
    return this.request('GET', `/audit${query ? `?${query}` : ''}`);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    merges: number;
    splits: number;
    explanations: number;
    auditEntries: number;
    entities: number;
  }> {
    return this.request('GET', '/stats');
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string; timestamp: string }> {
    return this.request('GET', '/health');
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }
}

/**
 * Create ER client
 */
export function createERClient(config: ERClientConfig): ERClient {
  return new ERClient(config);
}
