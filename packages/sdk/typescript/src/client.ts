/**
 * Summit SDK Client
 *
 * Main client for the Summit platform API.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module @summit/sdk
 */

import { GovernanceClient } from "./governance.js";
import { ComplianceClient } from "./compliance.js";
import type {
  AuditLogEntry,
  AuditQueryParams,
  AuthResponse,
  DataEnvelope,
  Integration,
  IntegrationActionRequest,
  IntegrationActionResult,
  Plugin,
  SummitConfig,
  SummitError,
  Tenant,
  TenantSettings,
  UserInfo,
} from "./types.js";

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<SummitConfig> = {
  timeout: 30000,
  retries: 3,
};

/**
 * Summit API Client
 *
 * @example
 * ```typescript
 * import { SummitClient } from '@summit/sdk';
 *
 * const client = new SummitClient({
 *   baseUrl: 'https://api.summit.example.com',
 *   apiKey: 'your-api-key',
 *   tenantId: 'tenant-123'
 * });
 *
 * // Authenticate
 * await client.login('user@example.com', 'password');
 *
 * // Use governance features
 * const result = await client.governance.evaluate({
 *   action: 'read',
 *   resource: { type: 'document', id: 'doc-123' }
 * });
 *
 * // Check compliance
 * const summary = await client.compliance.getSummary('SOC2');
 * ```
 */
export class SummitClient {
  private readonly config: SummitConfig;
  private token?: string;

  /**
   * Governance module for policy management and evaluation
   */
  public readonly governance: GovernanceClient;

  /**
   * Compliance module for framework and evidence management
   */
  public readonly compliance: ComplianceClient;

  constructor(config: SummitConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.token = config.token;

    // Initialize sub-clients
    const httpClient = {
      get: this.get.bind(this),
      post: this.post.bind(this),
      put: this.put.bind(this),
      delete: this.delete.bind(this),
    };

    this.governance = new GovernanceClient(httpClient);
    this.compliance = new ComplianceClient(httpClient);
  }

  // ==========================================================================
  // HTTP Methods
  // ==========================================================================

  /**
   * Get authorization headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    } else if (this.config.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }

    if (this.config.tenantId) {
      headers["X-Tenant-Id"] = this.config.tenantId;
    }

    return headers;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<DataEnvelope<T>> {
    const url = new URL(path, this.config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    let lastError: Error | undefined;
    const retries = this.config.retries || 3;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          method,
          headers: this.getHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status === 401) {
          this.config.onUnauthorized?.();
          throw this.createError("Unauthorized", "AUTH_REQUIRED", 401);
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw this.createError(
            errorBody.message || errorBody.error || `HTTP ${response.status}`,
            errorBody.code || "API_ERROR",
            response.status,
            response.headers.get("X-Request-Id") || undefined,
            errorBody.details
          );
        }

        return (await response.json()) as DataEnvelope<T>;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (error instanceof Error && "statusCode" in error) {
          const statusCode = (error as any).statusCode;
          if (statusCode >= 400 && statusCode < 500) {
            throw error;
          }
        }

        // Retry with exponential backoff for server errors
        if (attempt < retries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }

  private createError(
    message: string,
    code: string,
    statusCode: number,
    requestId?: string,
    details?: Record<string, unknown>
  ): SummitError {
    const error = new Error(message) as SummitError;
    (error as any).code = code;
    (error as any).statusCode = statusCode;
    (error as any).requestId = requestId;
    (error as any).details = details;
    return error;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<DataEnvelope<T>> {
    return this.request<T>("GET", path, undefined, params);
  }

  private async post<T>(path: string, body: unknown): Promise<DataEnvelope<T>> {
    return this.request<T>("POST", path, body);
  }

  private async put<T>(path: string, body: unknown): Promise<DataEnvelope<T>> {
    return this.request<T>("PUT", path, body);
  }

  private async delete<T>(path: string): Promise<DataEnvelope<T>> {
    return this.request<T>("DELETE", path);
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  /**
   * Authenticate with username and password
   *
   * @param email - User email
   * @param password - User password
   * @returns Authentication response with token
   */
  async login(email: string, password: string): Promise<DataEnvelope<AuthResponse>> {
    const response = await this.post<AuthResponse>("/auth/login", { email, password });
    this.token = response.data.token;
    return response;
  }

  /**
   * Authenticate with API key
   *
   * @param apiKey - API key
   * @returns Authentication response
   */
  async authenticateWithApiKey(apiKey: string): Promise<DataEnvelope<AuthResponse>> {
    this.config.apiKey = apiKey;
    return this.post<AuthResponse>("/auth/api-key", { apiKey });
  }

  /**
   * Refresh authentication token
   *
   * @param refreshToken - Refresh token
   * @returns New authentication response
   */
  async refreshToken(refreshToken: string): Promise<DataEnvelope<AuthResponse>> {
    const response = await this.post<AuthResponse>("/auth/refresh", { refreshToken });
    this.token = response.data.token;
    return response;
  }

  /**
   * Logout and invalidate token
   */
  async logout(): Promise<void> {
    await this.post("/auth/logout", {});
    this.token = undefined;
  }

  /**
   * Get current user information
   *
   * @returns Current user details
   */
  async getCurrentUser(): Promise<DataEnvelope<UserInfo>> {
    return this.get<UserInfo>("/auth/me");
  }

  // ==========================================================================
  // Tenant Management
  // ==========================================================================

  /**
   * Get current tenant information
   *
   * @returns Tenant details
   */
  async getTenant(): Promise<DataEnvelope<Tenant>> {
    return this.get<Tenant>("/tenants/current");
  }

  /**
   * Update tenant settings
   *
   * @param settings - Settings to update
   * @returns Updated tenant
   */
  async updateTenantSettings(settings: TenantSettings): Promise<DataEnvelope<Tenant>> {
    return this.put<Tenant>("/tenants/current/settings", settings);
  }

  /**
   * List users in tenant
   *
   * @returns List of users
   */
  async listUsers(): Promise<DataEnvelope<UserInfo[]>> {
    return this.get<UserInfo[]>("/users");
  }

  /**
   * Get user by ID
   *
   * @param userId - User identifier
   * @returns User details
   */
  async getUser(userId: string): Promise<DataEnvelope<UserInfo>> {
    return this.get<UserInfo>(`/users/${userId}`);
  }

  // ==========================================================================
  // Integration Management
  // ==========================================================================

  /**
   * List configured integrations
   *
   * @returns List of integrations
   */
  async listIntegrations(): Promise<DataEnvelope<Integration[]>> {
    return this.get<Integration[]>("/integrations");
  }

  /**
   * Get integration by ID
   *
   * @param integrationId - Integration identifier
   * @returns Integration details
   */
  async getIntegration(integrationId: string): Promise<DataEnvelope<Integration>> {
    return this.get<Integration>(`/integrations/${integrationId}`);
  }

  /**
   * Execute integration action
   *
   * @param request - Action request
   * @returns Action result
   *
   * @example
   * ```typescript
   * const result = await client.executeIntegrationAction({
   *   integrationId: 'slack-123',
   *   action: 'send_message',
   *   payload: {
   *     channel: '#alerts',
   *     message: 'Critical security event detected'
   *   }
   * });
   * ```
   */
  async executeIntegrationAction(
    request: IntegrationActionRequest
  ): Promise<DataEnvelope<IntegrationActionResult>> {
    return this.post<IntegrationActionResult>(`/integrations/${request.integrationId}/execute`, {
      action: request.action,
      payload: request.payload,
    });
  }

  // ==========================================================================
  // Plugin Management
  // ==========================================================================

  /**
   * List installed plugins
   *
   * @returns List of plugins
   */
  async listPlugins(): Promise<DataEnvelope<Plugin[]>> {
    return this.get<Plugin[]>("/plugins");
  }

  /**
   * Get plugin by ID
   *
   * @param pluginId - Plugin identifier
   * @returns Plugin details
   */
  async getPlugin(pluginId: string): Promise<DataEnvelope<Plugin>> {
    return this.get<Plugin>(`/plugins/${pluginId}`);
  }

  /**
   * Enable a plugin
   *
   * @param pluginId - Plugin identifier
   * @returns Updated plugin
   */
  async enablePlugin(pluginId: string): Promise<DataEnvelope<Plugin>> {
    return this.post<Plugin>(`/plugins/${pluginId}/enable`, {});
  }

  /**
   * Disable a plugin
   *
   * @param pluginId - Plugin identifier
   * @returns Updated plugin
   */
  async disablePlugin(pluginId: string): Promise<DataEnvelope<Plugin>> {
    return this.post<Plugin>(`/plugins/${pluginId}/disable`, {});
  }

  // ==========================================================================
  // Audit Logging
  // ==========================================================================

  /**
   * Query audit logs
   *
   * @param params - Query parameters
   * @returns Audit log entries
   *
   * @example
   * ```typescript
   * const logs = await client.queryAuditLogs({
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31',
   *   action: 'policy.update',
   *   limit: 100
   * });
   * ```
   */
  async queryAuditLogs(params?: AuditQueryParams): Promise<DataEnvelope<AuditLogEntry[]>> {
    const queryParams: Record<string, string> = {};
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.userId) queryParams.userId = params.userId;
    if (params?.action) queryParams.action = params.action;
    if (params?.resourceType) queryParams.resourceType = params.resourceType;
    if (params?.outcome) queryParams.outcome = params.outcome;
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.offset) queryParams.offset = params.offset.toString();
    return this.get<AuditLogEntry[]>("/audit/logs", queryParams);
  }

  /**
   * Get audit log entry by ID
   *
   * @param entryId - Audit log entry identifier
   * @returns Audit log entry
   */
  async getAuditLogEntry(entryId: string): Promise<DataEnvelope<AuditLogEntry>> {
    return this.get<AuditLogEntry>(`/audit/logs/${entryId}`);
  }

  // ==========================================================================
  // Health & Status
  // ==========================================================================

  /**
   * Check API health
   *
   * @returns Health status
   */
  async health(): Promise<
    DataEnvelope<{ status: "healthy" | "degraded" | "unhealthy"; version: string }>
  > {
    return this.get("/health");
  }

  /**
   * Get API version information
   *
   * @returns Version details
   */
  async version(): Promise<DataEnvelope<{ version: string; apiVersion: string }>> {
    return this.get("/version");
  }
}

// Re-export types and sub-clients
export * from "./types.js";
export { GovernanceClient } from "./governance.js";
export { ComplianceClient } from "./compliance.js";
