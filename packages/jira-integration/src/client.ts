import fetch, { HeadersInit, RequestInit, Response } from 'node-fetch';
import { createAuditEntry, AuditLogger } from './logger.js';
import { JiraIntegrationConfig } from './types.js';

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;

type FetchImplementation = (url: string, init?: RequestInit) => Promise<Response>;

const sleep = async (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

export class JiraApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly body?: unknown) {
    super(message);
    this.name = 'JiraApiError';
  }
}

export class JiraApiClient {
  private readonly fetchImpl: FetchImplementation;

  constructor(
    private readonly config: JiraIntegrationConfig,
    private readonly auditLogger: AuditLogger,
    fetchImplementation?: FetchImplementation
  ) {
    this.fetchImpl = fetchImplementation ?? (globalThis.fetch as FetchImplementation) ?? fetch;
  }

  private get authHeader(): string {
    const authToken = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
    return `Basic ${authToken}`;
  }

  private get retryConfig(): { attempts: number; delay: number } {
    return {
      attempts: this.config.maxRetries ?? DEFAULT_MAX_RETRIES,
      delay: this.config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
    };
  }

  async request<T>(path: string, init: RequestInit & { retryable?: boolean } = {}): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const { attempts, delay } = this.retryConfig;
    const headers: HeadersInit = {
      Authorization: this.authHeader,
      Accept: 'application/json',
      ...init.headers
    };

    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          ...init,
          headers,
          body: init.body,
          // enforce JSON content-type when sending objects
          ...(init.body && typeof init.body === 'string'
            ? {
                headers: {
                  'Content-Type': 'application/json',
                  ...headers
                }
              }
            : {})
        });

        if (!response.ok) {
          const bodyText = await response.text();
          throw new JiraApiError(`Jira API responded with ${response.status}`, response.status, bodyText);
        }

        this.auditLogger.record(
          createAuditEntry('jira_api_request', 'success', {
            entityId: url,
            payload: { method: init.method ?? 'GET', attempt }
          })
        );

        if (response.status === 204) {
          return {} as T;
        }

        return (await response.json()) as T;
      } catch (error: unknown) {
        lastError = error;
        const shouldRetry = attempt < attempts && (init.retryable ?? true);

        this.auditLogger.record(
          createAuditEntry('jira_api_request', 'error', {
            entityId: url,
            message: error instanceof Error ? error.message : 'Unknown error',
            payload: { method: init.method ?? 'GET', attempt }
          })
        );

        if (!shouldRetry) {
          break;
        }

        await sleep(delay * attempt);
      }
    }

    if (lastError instanceof JiraApiError) {
      throw lastError;
    }

    throw new JiraApiError('Failed to execute Jira API request', undefined, lastError);
  }
}
