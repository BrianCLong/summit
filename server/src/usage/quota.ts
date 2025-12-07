import { UsageDimension } from './events';

export interface QuotaCheck {
  tenantId: string;
  dimension: UsageDimension;
  quantity: number; // The amount of usage about to be consumed
}

export interface QuotaDecision {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number;
  hardLimit?: boolean;
}

export interface QuotaService {
  check(check: QuotaCheck): Promise<QuotaDecision>;
  assert(check: QuotaCheck): Promise<void>; // Throws an error on denial
}

export class PostgresQuotaService implements QuotaService {
  async check(check: QuotaCheck): Promise<QuotaDecision> {
    // TODO: Implement actual quota checking logic
    console.log('Checking quota:', check);
    // Placeholder logic: always allow
    return Promise.resolve({
      allowed: true,
      remaining: 1000, // Dummy value
      limit: 1000, // Dummy value
    });
  }

  async assert(check: QuotaCheck): Promise<void> {
    const decision = await this.check(check);
    if (!decision.allowed) {
      throw new Error(decision.reason || 'QUOTA_EXCEEDED');
    }
  }
}
