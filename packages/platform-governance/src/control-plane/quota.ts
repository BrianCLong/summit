import crypto from 'node:crypto';
import { QuotaBudget, QuotaConfig } from './types.js';

interface QuotaState {
  windowStart: number;
  count: number;
}

interface QuotaResult {
  allowed: boolean;
  remaining: number;
}

interface IdempotencyRecord {
  quotaConsumed: number;
  timestamp: number;
}

export class QuotaManager {
  private tenantQuota: QuotaBudget;
  private userQuota: QuotaBudget;
  private tenantState = new Map<string, QuotaState>();
  private userState = new Map<string, QuotaState>();
  private idempotency = new Map<string, IdempotencyRecord>();

  constructor(config: QuotaConfig) {
    this.tenantQuota = config.tenant;
    this.userQuota = config.user;
  }

  consume(tenantId: string, userId: string, idempotencyKey?: string): {
    tenant: QuotaResult;
    user: QuotaResult;
    replay: boolean;
    id: string;
  } {
    const key = idempotencyKey ?? crypto.randomUUID();
    const replay = this.idempotency.has(key);

    if (replay) {
      return {
        tenant: { allowed: true, remaining: this.remainingBudget(this.tenantQuota, this.tenantState, tenantId) },
        user: { allowed: true, remaining: this.remainingBudget(this.userQuota, this.userState, userId) },
        replay,
        id: key,
      };
    }

    const tenant = this.consumeBudget(this.tenantQuota, this.tenantState, tenantId);
    const user = this.consumeBudget(this.userQuota, this.userState, userId);
    this.idempotency.set(key, { quotaConsumed: 1, timestamp: Date.now() });

    return { tenant, user, replay, id: key };
  }

  private consumeBudget(budget: QuotaBudget, state: Map<string, QuotaState>, key: string): QuotaResult {
    const now = Date.now();
    const windowStart = now - budget.intervalSeconds * 1000;
    const current = state.get(key);

    if (!current || current.windowStart < windowStart) {
      state.set(key, { windowStart: now, count: 1 });
      return { allowed: true, remaining: budget.maxCalls - 1 };
    }

    if (current.count >= budget.maxCalls) {
      return { allowed: false, remaining: 0 };
    }

    current.count += 1;
    state.set(key, current);
    return { allowed: true, remaining: budget.maxCalls - current.count };
  }

  private remainingBudget(budget: QuotaBudget, state: Map<string, QuotaState>, key: string): number {
    const now = Date.now();
    const windowStart = now - budget.intervalSeconds * 1000;
    const current = state.get(key);
    if (!current || current.windowStart < windowStart) {
      return budget.maxCalls;
    }
    return Math.max(0, budget.maxCalls - current.count);
  }
}
