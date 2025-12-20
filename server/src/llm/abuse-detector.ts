import { ChatMessage } from './types.js';

export interface AbuseConfig {
  promptLimit?: number;
  failureThreshold?: number;
  windowSeconds?: number;
  suspiciousPatterns?: string[];
}

export interface SecurityEvent {
  type: string;
  tenantId: string;
  reason: string;
  details?: Record<string, unknown>;
}

export class AbuseDetector {
  private failures: Map<string, number[]> = new Map();

  recordFailure(tenantId: string, windowSeconds: number) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const existing = this.failures.get(tenantId) || [];
    const filtered = existing.filter((ts) => now - ts <= windowMs);
    filtered.push(now);
    this.failures.set(tenantId, filtered);
  }

  exceededFailures(tenantId: string, failureThreshold: number, windowSeconds: number): boolean {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const existing = this.failures.get(tenantId) || [];
    const filtered = existing.filter((ts) => now - ts <= windowMs);
    this.failures.set(tenantId, filtered);
    return filtered.length >= failureThreshold;
  }

  checkPromptLimit(
    tenantId: string,
    messages: ChatMessage[],
    limit?: number,
  ): SecurityEvent | null {
    if (!limit) return null;
    const totalLength = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
    if (totalLength > limit) {
      return {
        type: 'prompt_limit_exceeded',
        tenantId,
        reason: `Prompt length ${totalLength} exceeds limit ${limit}`,
      };
    }
    return null;
  }

  detectSuspicious(
    tenantId: string,
    messages: ChatMessage[],
    patterns: string[] = [],
  ): SecurityEvent | null {
    if (!patterns.length) return null;
    const combined = messages.map((m) => m.content || '').join('\n');
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(combined)) {
        return {
          type: 'suspicious_prompt',
          tenantId,
          reason: `Matched pattern: ${pattern}`,
        };
      }
    }
    return null;
  }
}
