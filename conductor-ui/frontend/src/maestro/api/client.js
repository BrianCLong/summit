import { getMaestroConfig, authHeaders } from '../config';
/**
 * Production-ready Maestro API Client
 * Implements all OpenAPI 3.1 endpoints with proper error handling,
 * authentication, and type safety.
 */
export class MaestroApiClient {
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
  async request(endpoint, options = {}) {
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
  async getSummary() {
    return this.request('/summary');
  }
  // Runs API
  async getRuns(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return this.request(`/runs${query ? `?${query}` : ''}`);
  }
  async getRun(id) {
    return this.request(`/runs/${encodeURIComponent(id)}`);
  }
  async executeRunAction(id, action) {
    return this.request(`/runs/${encodeURIComponent(id)}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }
  async getRunGraph(id) {
    return this.request(`/runs/${encodeURIComponent(id)}/graph`);
  }
  // Pipelines API
  async getPipelines() {
    return this.request('/pipelines');
  }
  async getPipeline(id) {
    return this.request(`/pipelines/${encodeURIComponent(id)}`);
  }
  async simulatePipeline(id, changes) {
    return this.request(`/pipelines/${encodeURIComponent(id)}/simulate`, {
      method: 'POST',
      body: JSON.stringify(changes),
    });
  }
  // Routing API
  async getRoutingCandidates(requestClass) {
    const params = requestClass
      ? `?class=${encodeURIComponent(requestClass)}`
      : '';
    return this.request(`/routing/candidates${params}`);
  }
  async pinRoute(pin) {
    return this.request('/routing/pin', {
      method: 'POST',
      body: JSON.stringify(pin),
    });
  }
  // SLO & Observability API
  async getSLOs() {
    return this.request('/slo');
  }
  async getAlerts() {
    return this.request('/alerts');
  }
  async acknowledgeAlert(id, ack) {
    return this.request(`/alerts/${encodeURIComponent(id)}/ack`, {
      method: 'POST',
      body: JSON.stringify(ack),
    });
  }
  // Evidence & Attestations API
  async generateEvidenceBundle(runId) {
    return this.request(`/evidence/run/${encodeURIComponent(runId)}`, {
      method: 'POST',
    });
  }
  // Budget & FinOps API
  async getBudgets() {
    return this.request('/budgets');
  }
  async updateBudget(budget) {
    return this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  }
  async freezeBudget(id) {
    return this.request(`/budgets/${encodeURIComponent(id)}/freeze`, {
      method: 'POST',
    });
  }
  // Recipes API
  async getRecipes() {
    return this.request('/recipes');
  }
  async instantiateRecipe(id, params) {
    return this.request(`/recipes/${encodeURIComponent(id)}/instantiate`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
  // Audit API
  async getAuditLog(params = {}) {
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
  createEventStream(endpoint) {
    const url = `${this.baseUrl}/streams/${endpoint}`;
    return new EventSource(url, { withCredentials: true });
  }
  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}
// Singleton instance
export const maestroApi = new MaestroApiClient();
