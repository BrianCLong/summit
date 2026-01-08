/**
 * Summit SDK Main Client
 *
 * Primary client for interacting with the Summit Platform API.
 * Provides unified access to all platform services with built-in
 * authentication, retries, and rate limiting.
 *
 * @module @summit/sdk
 */

/* eslint-disable require-await, no-console */
import { EventEmitter } from "events";

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * SDK configuration options
 */
export interface SummitClientConfig {
  baseUrl: string;
  tenantId?: string;
  apiKey?: string;
  accessToken?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
}

/**
 * Authentication method
 */
export type AuthMethod = "api_key" | "oauth2" | "jwt";

/**
 * Request options
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * SDK event types
 */
export interface SummitClientEvents {
  "auth:login": { method: AuthMethod };
  "auth:logout": void;
  "auth:refresh": void;
  "request:start": { method: string; url: string };
  "request:complete": { method: string; url: string; duration: number };
  "request:error": { method: string; url: string; error: Error };
  "rate_limit:exceeded": { retryAfter: number };
}

/**
 * Rate limit info
 */
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

// ============================================================================
// Summit Client Implementation
// ============================================================================

export class SummitClient extends EventEmitter {
  private config: Required<SummitClientConfig>;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config: SummitClientConfig) {
    super();
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ""),
      tenantId: config.tenantId || "",
      apiKey: config.apiKey || "",
      accessToken: config.accessToken || "",
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      enableLogging: config.enableLogging ?? false,
      logLevel: config.logLevel || "info",
    };

    if (config.accessToken) {
      this.accessToken = config.accessToken;
    }
  }

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  /**
   * Authenticate with API key
   */
  public async authenticateWithApiKey(apiKey: string): Promise<void> {
    this.config.apiKey = apiKey;
    this.emit("auth:login", { method: "api_key" });
    this.log("info", "Authenticated with API key");
  }

  /**
   * Authenticate with OAuth2
   */
  public async authenticateWithOAuth2(
    clientId: string,
    clientSecret: string,
    scopes: string[] = []
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const response = await this.request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    }>("/oauth/token", {
      method: "POST",
      body: {
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: scopes.join(" "),
      },
    });

    this.accessToken = response.data.access_token;
    this.refreshToken = response.data.refresh_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

    this.emit("auth:login", { method: "oauth2" });
    this.log("info", "Authenticated with OAuth2");

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  }

  /**
   * Authenticate with username/password
   */
  public async authenticateWithPassword(
    email: string,
    password: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await this.request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    this.accessToken = response.data.access_token;
    this.refreshToken = response.data.refresh_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

    this.emit("auth:login", { method: "jwt" });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
    };
  }

  /**
   * Refresh access token
   */
  public async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await this.request<{
      access_token: string;
      expires_in: number;
    }>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: this.refreshToken },
    });

    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

    this.emit("auth:refresh");
    this.log("info", "Access token refreshed");
  }

  /**
   * Logout and clear credentials
   */
  public logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.config.apiKey = "";
    this.emit("auth:logout");
    this.log("info", "Logged out");
  }

  /**
   * Check if authenticated
   */
  public isAuthenticated(): boolean {
    if (this.config.apiKey) {
      return true;
    }
    if (!this.accessToken) {
      return false;
    }
    if (this.tokenExpiry && this.tokenExpiry <= new Date()) {
      return false;
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // HTTP Request Methods
  // --------------------------------------------------------------------------

  /**
   * Make an API request
   */
  public async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { method = "GET", body, query, headers = {} } = options;
    let url = `${this.config.baseUrl}${path}`;

    // Add query parameters
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    };

    // Add authentication
    if (this.config.apiKey) {
      requestHeaders["X-API-Key"] = this.config.apiKey;
    } else if (this.accessToken) {
      // Auto-refresh if token is about to expire
      if (this.tokenExpiry && this.refreshToken) {
        const expiresIn = this.tokenExpiry.getTime() - Date.now();
        if (expiresIn < 60000) {
          await this.refreshAccessToken();
        }
      }
      requestHeaders["Authorization"] = `Bearer ${this.accessToken}`;
    }

    // Add tenant ID if set
    if (this.config.tenantId) {
      requestHeaders["X-Tenant-ID"] = this.config.tenantId;
    }

    // Emit request start event
    this.emit("request:start", { method, url });
    const startTime = Date.now();

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.config.retries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse rate limit headers
        this.parseRateLimitHeaders(response.headers);

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
          this.emit("rate_limit:exceeded", { retryAfter });

          if (attempt < this.config.retries - 1) {
            await this.delay(retryAfter * 1000);
            attempt++;
            continue;
          }
        }

        // Parse response
        const data = await this.parseResponse<T>(response);
        const duration = Date.now() - startTime;

        this.emit("request:complete", { method, url, duration });
        this.log("debug", `${method} ${path} completed in ${duration}ms`);

        return {
          data,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          requestId: response.headers.get("X-Request-ID") || undefined,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if retryable
        if (this.isRetryableError(lastError)) {
          attempt++;
          if (attempt < this.config.retries) {
            const delay = this.calculateRetryDelay(attempt);
            this.log(
              "warn",
              `Request failed, retrying in ${delay}ms (attempt ${attempt}/${this.config.retries})`
            );
            await this.delay(delay);
            continue;
          }
        }

        this.emit("request:error", { method, url, error: lastError });
        throw lastError;
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * GET request
   */
  public async get<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "GET", query, headers: options?.headers });
  }

  /**
   * POST request
   */
  public async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "POST", body, headers: options?.headers });
  }

  /**
   * PUT request
   */
  public async put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "PUT", body, headers: options?.headers });
  }

  /**
   * PATCH request
   */
  public async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "PATCH", body, headers: options?.headers });
  }

  /**
   * DELETE request
   */
  public async delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "DELETE", headers: options?.headers });
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<SummitClientConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SummitClientConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Set tenant ID
   */
  public setTenantId(tenantId: string): void {
    this.config.tenantId = tenantId;
  }

  /**
   * Get rate limit info
   */
  public getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    latency: number;
    version?: string;
  }> {
    const start = Date.now();
    try {
      const response = await this.get<{ status: string; version: string }>("/health");
      return {
        status: "healthy",
        latency: Date.now() - start,
        version: response.data.version,
      };
    } catch (_error) {
      return {
        status: "unhealthy",
        latency: Date.now() - start,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        // Use default error message
      }

      const error = new Error(errorMessage) as Error & { status: number; body: string };
      error.status = response.status;
      error.body = errorBody;
      throw error;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  private parseRateLimitHeaders(headers: Headers): void {
    const limit = headers.get("X-RateLimit-Limit");
    const remaining = headers.get("X-RateLimit-Remaining");
    const reset = headers.get("X-RateLimit-Reset");

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: new Date(parseInt(reset, 10) * 1000),
      };
    }
  }

  private isRetryableError(error: Error): boolean {
    if (error.name === "AbortError") {
      return false;
    }

    const errorWithStatus = error as Error & { status?: number };
    if (errorWithStatus.status) {
      return [408, 429, 500, 502, 503, 504].includes(errorWithStatus.status);
    }

    return error.message.includes("fetch") || error.message.includes("network");
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    const exponentialBackoff = baseDelay * Math.pow(2, attempt - 1);
    const jitter = exponentialBackoff * (0.5 + Math.random() * 0.5);
    return Math.min(jitter, 30000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private log(level: "debug" | "info" | "warn" | "error", message: string): void {
    if (!this.config.enableLogging) {
      return;
    }

    const levels = ["debug", "info", "warn", "error"];
    if (levels.indexOf(level) < levels.indexOf(this.config.logLevel)) {
      return;
    }

    const timestamp = new Date().toISOString();
    console[level](`[Summit SDK ${timestamp}] ${message}`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Summit client instance
 */
export function createSummitClient(config: SummitClientConfig): SummitClient {
  return new SummitClient(config);
}
