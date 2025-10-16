import { getMaestroConfig, authHeaders } from '../config';
import type {
  ControlHubSummary,
  Run,
  RunsListResponse,
  Pipeline,
  SLO,
  Alert,
  EvidenceBundle,
  RoutingCandidate,
  ApiResponse,
} from '../types/maestro-api';

/**
 * Production-ready Maestro API Client
 * Implements all OpenAPI 3.1 endpoints with proper error handling,
 * authentication, and type safety.
 */
export class MaestroApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor() {
    const config = getMaestroConfig();
    this.baseUrl =
      config.gatewayBase?.replace(/\/$/, '') ||
      'https://maestro-dev.topicality.co/api/maestro/v1';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...authHeaders(config),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          // Use default error message if JSON parsing fails
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        data,
        traceId: response.headers.get('x-trace-id') || undefined,
      };
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId: undefined,
      };
    }
  }

  // Control Hub API
  async getSummary(): Promise<ApiResponse<ControlHubSummary>> {
    return this.request<ControlHubSummary>('/summary');
  }

  // Runs API
  async getRuns(
    params: {
      status?: string;
      pipeline?: string;
      env?: string;
      q?: string;
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<ApiResponse<RunsListResponse>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    return this.request<RunsListResponse>(`/runs${query ? `?${query}` : ''}`);
  }

  async getRun(id: string): Promise<ApiResponse<Run>> {
    return this.request<Run>(`/runs/${encodeURIComponent(id)}`);
  }

  async executeRunAction(
    id: string,
    action: {
      action: 'promote' | 'pause' | 'resume' | 'rerun' | 'rollback';
      reason?: string;
    },
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/runs/${encodeURIComponent(id)}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  async getRunGraph(id: string): Promise<
    ApiResponse<{
      nodes: { id: string; label: string; state: string; retries?: number }[];
      edges: { from: string; to: string }[];
    }>
  > {
    return this.request(`/runs/${encodeURIComponent(id)}/graph`);
  }

  // Pipelines API
  async getPipelines(): Promise<ApiResponse<Pipeline[]>> {
    return this.request<Pipeline[]>('/pipelines');
  }

  async getPipeline(id: string): Promise<ApiResponse<Pipeline>> {
    return this.request<Pipeline>(`/pipelines/${encodeURIComponent(id)}`);
  }

  async simulatePipeline(
    id: string,
    changes: {
      changes: Record<string, unknown>;
      policies: string[];
    },
  ): Promise<
    ApiResponse<{
      diff: Record<string, unknown>;
      violations: Record<string, unknown>[];
    }>
  > {
    return this.request(`/pipelines/${encodeURIComponent(id)}/simulate`, {
      method: 'POST',
      body: JSON.stringify(changes),
    });
  }

  // Routing API
  async getRoutingCandidates(requestClass?: string): Promise<
    ApiResponse<{
      candidates: RoutingCandidate[];
    }>
  > {
    const params = requestClass
      ? `?class=${encodeURIComponent(requestClass)}`
      : '';
    return this.request(`/routing/candidates${params}`);
  }

  async pinRoute(pin: {
    class: string;
    provider: string;
    model: string;
    ttl?: number;
  }): Promise<ApiResponse<{ success: boolean }>> {
    return this.request('/routing/pin', {
      method: 'POST',
      body: JSON.stringify(pin),
    });
  }

  // SLO & Observability API
  async getSLOs(): Promise<ApiResponse<SLO[]>> {
    return this.request<SLO[]>('/slo');
  }

  async getAlerts(): Promise<ApiResponse<Alert[]>> {
    return this.request<Alert[]>('/alerts');
  }

  async acknowledgeAlert(
    id: string,
    ack: {
      assignee: string;
      note?: string;
    },
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/alerts/${encodeURIComponent(id)}/ack`, {
      method: 'POST',
      body: JSON.stringify(ack),
    });
  }

  // Evidence & Attestations API
  async generateEvidenceBundle(
    runId: string,
  ): Promise<ApiResponse<EvidenceBundle>> {
    return this.request<EvidenceBundle>(
      `/evidence/run/${encodeURIComponent(runId)}`,
      {
        method: 'POST',
      },
    );
  }

  // Budget & FinOps API
  async getBudgets(): Promise<
    ApiResponse<{
      id: string;
      tier: string;
      caps: Record<string, unknown>;
      usage: Record<string, unknown>[];
      alerts: string[];
    }>
  > {
    return this.request('/budgets');
  }

  async updateBudget(budget: {
    id: string;
    caps: Record<string, unknown>;
  }): Promise<ApiResponse<{ success: boolean }>> {
    return this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  }

  async freezeBudget(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/budgets/${encodeURIComponent(id)}/freeze`, {
      method: 'POST',
    });
  }

  // Recipes API
  async getRecipes(): Promise<
    ApiResponse<
      {
        id: string;
        name: string;
        version: string;
        verified: boolean;
        signature: string;
        trustScore: number;
      }[]
    >
  > {
    return this.request('/recipes');
  }

  async instantiateRecipe(
    id: string,
    params: {
      params: Record<string, unknown>;
      name: string;
    },
  ): Promise<ApiResponse<{ pipelineId: string }>> {
    return this.request(`/recipes/${encodeURIComponent(id)}/instantiate`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Audit API
  async getAuditLog(
    params: {
      since?: string;
      limit?: number;
    } = {},
  ): Promise<
    ApiResponse<
      {
        timestamp: string;
        actor: string;
        action: string;
        resource: string;
        details: Record<string, unknown>;
      }[]
    >
  > {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    return this.request(`/audit${query ? `?${query}` : ''}`);
  }

  // Server-Sent Events connections
  createEventStream(endpoint: string): EventSource {
    const url = `${this.baseUrl}/streams/${endpoint}`;
    return new EventSource(url, { withCredentials: true });
  }

  // Health check
  async healthCheck(): Promise<
    ApiResponse<{ status: 'healthy' | 'degraded' | 'unhealthy' }>
  > {
    return this.request('/health');
  }
}

// Singleton instance
export const maestroApi = new MaestroApiClient();
