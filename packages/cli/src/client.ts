/**
 * Summit CLI API Client
 *
 * HTTP client for CLI commands.
 *
 * @module @summit/cli/client
 */

/* eslint-disable no-console */
import chalk from "chalk";
import { getConfig, isAuthenticated, isConfigured } from "./config.js";

/**
 * DataEnvelope wrapper for API responses
 */
export interface DataEnvelope<T> {
  data: T;
  metadata: {
    requestId: string;
    tenantId: string;
  };
  verdict: string;
  timestamp: string;
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>
): Promise<DataEnvelope<T>> {
  const config = getConfig();

  if (!isConfigured()) {
    console.error(chalk.red("CLI not configured. Run `summit config init` first."));
    process.exit(1);
  }

  if (!isAuthenticated()) {
    console.error(chalk.red("Not authenticated. Run `summit login` first."));
    process.exit(1);
  }

  const url = new URL(path, config.baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  } else if (config.apiKey) {
    headers["X-API-Key"] = config.apiKey;
  }

  if (config.tenantId) {
    headers["X-Tenant-Id"] = config.tenantId;
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as {
        error?: string;
        message?: string;
      };
      console.error(
        chalk.red(`Error: ${errorData.error || errorData.message || `HTTP ${response.status}`}`)
      );
      process.exit(1);
    }

    return (await response.json()) as DataEnvelope<T>;
  } catch (error) {
    console.error(chalk.red(`Request failed: ${(error as Error).message}`));
    process.exit(1);
  }
}

/**
 * GET request helper
 */
export function get<T>(path: string, params?: Record<string, string>): Promise<DataEnvelope<T>> {
  return apiRequest<T>("GET", path, undefined, params);
}

/**
 * POST request helper
 */
export function post<T>(path: string, body: unknown): Promise<DataEnvelope<T>> {
  return apiRequest<T>("POST", path, body);
}

/**
 * PUT request helper
 */
export function put<T>(path: string, body: unknown): Promise<DataEnvelope<T>> {
  return apiRequest<T>("PUT", path, body);
}

/**
 * DELETE request helper
 */
export function del<T>(path: string): Promise<DataEnvelope<T>> {
  return apiRequest<T>("DELETE", path);
}
