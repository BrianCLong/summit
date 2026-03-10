import { AgentResult, AgentTask, IAgentAdapter } from './types.js';

export class AdapterError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'AdapterError';
  }
}

export class RateLimitError extends AdapterError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends AdapterError {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export abstract class BaseAdapter implements IAgentAdapter {
  abstract name: string;
  protected maxRetries = 3;
  protected baseDelayMs = 500;
  protected requestsPerMinute: number;
  private tokens: number;
  private lastRefill: number;

  constructor(options: { requestsPerMinute?: number } = {}) {
    this.requestsPerMinute = options.requestsPerMinute || 60;
    this.tokens = this.requestsPerMinute;
    this.lastRefill = Date.now();
  }

  abstract invoke(task: AgentTask): Promise<AgentResult>;

  protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        await this.checkRateLimit();
        return await fn();
      } catch (error: unknown) {
        lastError = error;
        const status = (error as { status?: number }).status;
        if (error instanceof RateLimitError || status === 429) {
          const delay = this.baseDelayMs * Math.pow(2, i) + Math.random() * 100;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refill = (elapsed / 60000) * this.requestsPerMinute;

    this.tokens = Math.min(this.requestsPerMinute, this.tokens + refill);
    this.lastRefill = now;

    if (this.tokens < 1) {
      throw new RateLimitError();
    }
    this.tokens -= 1;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
