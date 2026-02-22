/**
 * Switchboard Execution Guardrails
 */

export interface GuardrailConfig {
  maxConcurrent?: number;
  timeoutMs?: number;
  rateLimit?: {
    tokensPerSecond: number;
    burst: number;
  };
}

export interface GuardrailDecision {
  allow: boolean;
  reason?: string;
}

export class GuardrailManager {
  private activeCount: number = 0;
  private tokens: number;
  private lastRefill: number;

  constructor(private config: GuardrailConfig) {
    this.tokens = config.rateLimit?.burst ?? 0;
    this.lastRefill = Date.now();
  }

  /**
   * Check if a tool execution is allowed under current guardrails.
   */
  check(): GuardrailDecision {
    // 1. Concurrency Check
    if (this.config.maxConcurrent && this.activeCount >= this.config.maxConcurrent) {
      return { allow: false, reason: `Max concurrency reached (${this.config.maxConcurrent})` };
    }

    // 2. Rate Limit Check (Token Bucket)
    if (this.config.rateLimit) {
      this.refillTokens();
      if (this.tokens < 1) {
        return { allow: false, reason: 'Rate limit exceeded (token bucket empty)' };
      }
      this.tokens -= 1;
    }

    return { allow: true };
  }

  startExecution(): void {
    this.activeCount++;
  }

  endExecution(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
  }

  getTimeout(): number | undefined {
    return this.config.timeoutMs;
  }

  private refillTokens(): void {
    if (!this.config.rateLimit) return;

    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    const refill = elapsedSec * this.config.rateLimit.tokensPerSecond;

    this.tokens = Math.min(
      this.config.rateLimit.burst,
      this.tokens + refill
    );
    this.lastRefill = now;
  }
}
