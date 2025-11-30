/**
 * API Client for Admin CLI
 * Communicates with IntelGraph Admin APIs
 */

import { v4 as uuidv4 } from 'uuid';
import type { ApiClientInterface, ApiResponse, ApiError } from '../types/index.js';
import { logger } from './logger.js';

/**
 * API Client configuration
 */
interface ApiClientConfig {
  endpoint: string;
  token?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * HTTP method type
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Create API client instance
 */
export function createApiClient(config: ApiClientConfig): ApiClientInterface {
  const { endpoint, token, timeout = 30000, retries = 3, retryDelay = 1000 } = config;

  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${endpoint.replace(/\/$/, '')}${path}`;
    const requestId = uuidv4();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Request-ID': requestId,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add audit nonce and timestamp for tracked operations
    const nonce = uuidv4();
    const ts = Math.floor(Date.now() / 1000);
    headers['X-Audit-Nonce'] = nonce;
    headers['X-Audit-Ts'] = String(ts);

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeout),
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    logger.debug(`API Request: ${method} ${url}`, { requestId });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);

        const responseData = (await response.json().catch(() => null)) as Record<string, unknown> | null;

        if (!response.ok) {
          const error: ApiError = {
            code: (responseData?.code as string) ?? `HTTP_${response.status}`,
            message: (responseData?.error as string) ?? (responseData?.message as string) ?? response.statusText,
            details: responseData?.details as Record<string, unknown> | undefined,
          };

          logger.debug(`API Error: ${response.status}`, { requestId, error });

          return {
            success: false,
            error,
            meta: {
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
        }

        logger.debug(`API Response: ${response.status}`, { requestId });

        return {
          success: true,
          data: (responseData?.data ?? responseData) as T,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Don't retry if request was aborted (timeout)
        if (lastError.name === 'AbortError' || lastError.name === 'TimeoutError') {
          break;
        }

        logger.debug(`API request failed (attempt ${attempt + 1}/${retries + 1})`, {
          error: lastError.message,
          requestId,
        });

        if (attempt < retries) {
          await sleep(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: lastError?.message ?? 'Network request failed',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    get<T>(path: string): Promise<ApiResponse<T>> {
      return request<T>('GET', path);
    },

    post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
      return request<T>('POST', path, body);
    },

    put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
      return request<T>('PUT', path, body);
    },

    delete<T>(path: string): Promise<ApiResponse<T>> {
      return request<T>('DELETE', path);
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock API client for testing/dry-run
 */
export function createMockApiClient(): ApiClientInterface {
  return {
    async get<T>(_path: string): Promise<ApiResponse<T>> {
      return {
        success: true,
        data: {} as T,
        meta: {
          requestId: 'mock-' + uuidv4(),
          timestamp: new Date().toISOString(),
        },
      };
    },

    async post<T>(_path: string, _body: unknown): Promise<ApiResponse<T>> {
      return {
        success: true,
        data: {} as T,
        meta: {
          requestId: 'mock-' + uuidv4(),
          timestamp: new Date().toISOString(),
        },
      };
    },

    async put<T>(_path: string, _body: unknown): Promise<ApiResponse<T>> {
      return {
        success: true,
        data: {} as T,
        meta: {
          requestId: 'mock-' + uuidv4(),
          timestamp: new Date().toISOString(),
        },
      };
    },

    async delete<T>(_path: string): Promise<ApiResponse<T>> {
      return {
        success: true,
        data: {} as T,
        meta: {
          requestId: 'mock-' + uuidv4(),
          timestamp: new Date().toISOString(),
        },
      };
    },
  };
}
