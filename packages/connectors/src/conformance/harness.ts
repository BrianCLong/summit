import { randomUUID } from 'crypto';

import {
  ConformanceConnector,
  ConformanceReport,
  ConformanceTestResult,
  ConnectorError,
} from './types';

interface HarnessOptions {
  pageSize?: number;
  maxRetries?: number;
  rateLimitChecks?: number;
}

export class ConnectorConformanceHarness<TResource = Record<string, unknown>> {
  private readonly options: Required<HarnessOptions>;

  constructor(private readonly connector: ConformanceConnector<TResource>, options?: HarnessOptions) {
    this.options = {
      pageSize: options?.pageSize ?? 2,
      maxRetries: options?.maxRetries ?? 3,
      rateLimitChecks: options?.rateLimitChecks ?? 4,
    };
  }

  async run(): Promise<ConformanceReport> {
    const results: ConformanceTestResult[] = [];
    await this.connector.reset();

    results.push(await this.runCheck('idempotency', () => this.testIdempotency()));
    results.push(await this.runCheck('retries', () => this.testRetries()));
    results.push(await this.runCheck('pagination', () => this.testPagination()));
    results.push(await this.runCheck('rate limits', () => this.testRateLimits()));
    results.push(await this.runCheck('error mapping', () => this.testErrorMapping()));
    results.push(await this.runCheck('evidence completeness', () => this.testEvidenceCompleteness()));
    results.push(await this.runCheck('redaction', () => this.testRedaction()));

    const failures = results.filter((result) => !result.passed);
    return {
      connectorName: (this.connector as { name?: string }).name ?? 'connector-under-test',
      passed: failures.length === 0,
      results,
      failures,
    };
  }

  private async runCheck(name: string, check: () => Promise<void>): Promise<ConformanceTestResult> {
    try {
      await check();
      return { name, passed: true };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      return { name, passed: false, details };
    }
  }

  private async testIdempotency() {
    const payload = { id: randomUUID(), value: 'sample', nested: { iteration: 1 } } as TResource;
    const first = await this.connector.performIdempotentWrite(payload);
    const second = await this.connector.performIdempotentWrite(payload);

    if (first.id !== second.id) {
      throw new Error('Idempotent writes must reuse the same identifier.');
    }

    if (first.checksum !== second.checksum) {
      throw new Error('Idempotent writes must reuse the same checksum for identical payloads.');
    }

    const readBack = await this.connector.performIdempotentRead(first.id);
    if (JSON.stringify(readBack) !== JSON.stringify(payload)) {
      throw new Error('Reads must reflect the originally provided payload.');
    }
  }

  private async testRetries() {
    let success = false;
    let lastError: ConnectorError | undefined;
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt += 1) {
      const result = await this.connector.simulateTransientFailure(attempt);
      if (result.success) {
        success = true;
        break;
      }
      lastError = result.error;
      if (result.error && !result.error.retryable) {
        throw new Error(`Encountered non-retryable error on attempt ${attempt}`);
      }
    }

    if (!success) {
      throw new Error(`Operation did not succeed within ${this.options.maxRetries} attempts. Last error: ${lastError?.code}`);
    }
  }

  private async testPagination() {
    let cursor: string | null | undefined;
    const seen = new Set<string>();
    let pageCounter = 0;

    while (true) {
      const page = await this.connector.fetchPage(cursor ?? null, this.options.pageSize);
      pageCounter += 1;

      if (page.items.length === 0) {
        throw new Error('Pagination returned an empty page before completion.');
      }

      if (page.items.length > this.options.pageSize) {
        throw new Error('Page size exceeds requested maximum.');
      }

      page.items.forEach((item) => {
        const candidateId = (item as { id?: string }).id ?? JSON.stringify(item);
        if (seen.has(candidateId)) {
          throw new Error('Pagination returned duplicate items across pages.');
        }
        seen.add(candidateId);
      });

      if (!page.nextCursor) {
        break;
      }
      cursor = page.nextCursor;

      if (pageCounter > 20) {
        throw new Error('Pagination did not terminate within expected bounds.');
      }
    }

    if (seen.size === 0) {
      throw new Error('Pagination yielded no results.');
    }
  }

  private async testRateLimits() {
    let previousRemaining: number | null = null;

    for (let i = 0; i < this.options.rateLimitChecks; i += 1) {
      const { rateLimitInfo } = await this.connector.invokeWithRateLimit();
      const { remaining, limit } = rateLimitInfo;

      if (remaining < 0 || remaining > limit) {
        throw new Error('Rate limit counters must stay within 0..limit.');
      }

      if (previousRemaining !== null && remaining > previousRemaining) {
        const resetExpected = remaining === limit - 1;
        if (!resetExpected) {
          throw new Error('Rate limit remaining counter increased unexpectedly.');
        }
      }

      previousRemaining = remaining;
    }
  }

  private async testErrorMapping() {
    const expectedStatus: Record<string, number> = {
      NOT_FOUND: 404,
      UNAUTHORIZED: 401,
      RATE_LIMIT: 429,
    };

    await Promise.all(
      Object.entries(expectedStatus).map(async ([code, status]) => {
        const error = await this.connector.mapError(code);
        if (error.code !== code) {
          throw new Error(`Expected error code ${code} but received ${error.code}`);
        }
        if (error.status !== status) {
          throw new Error(`Expected status ${status} for ${code} but received ${error.status}`);
        }
        if (!error.message) {
          throw new Error(`Mapped error ${code} must include a message.`);
        }
      }),
    );
  }

  private async testEvidenceCompleteness() {
    const evidence = await this.connector.collectEvidence();
    const requiredCoverage = ['idempotency', 'retries', 'pagination', 'rateLimits', 'errors', 'redaction'];

    if (!evidence.timestamp || Number.isNaN(Date.parse(String(evidence.timestamp)))) {
      throw new Error('Evidence must include a valid timestamp.');
    }
    if (!Array.isArray(evidence.operations) || evidence.operations.length === 0) {
      throw new Error('Evidence must list executed operations.');
    }

    for (const coverageKey of requiredCoverage) {
      if (evidence.coverage?.[coverageKey] !== true) {
        throw new Error(`Coverage flag missing or false for ${coverageKey}.`);
      }
    }
  }

  private async testRedaction() {
    const secretPayload = {
      token: 'super-secret-token',
      password: 'p@ssw0rd',
      nested: { apiKey: 'abc123', safe: 'ok' },
      headers: { authorization: 'Bearer hidden' },
    } satisfies Record<string, unknown>;

    const redacted = await this.connector.redactSecrets(secretPayload);
    const serialized = JSON.stringify(redacted).toLowerCase();

    const forbidden = ['super-secret-token', 'p@ssw0rd', 'abc123', 'bearer hidden'];
    const stillLeaking = forbidden.filter((secret) => serialized.includes(secret));

    if (stillLeaking.length > 0) {
      throw new Error(`Secrets not redacted: ${stillLeaking.join(', ')}`);
    }
  }
}

export default ConnectorConformanceHarness;
