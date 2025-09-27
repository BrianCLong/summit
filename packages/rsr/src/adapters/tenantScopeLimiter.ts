import { BasePolicyAdapter } from './base.js';
import type { AdapterEvaluation, ReadonlyQueryContext } from '../types.js';

export interface TenantScopeLimiterOptions {
  allowedTenants: ReadonlyArray<string>;
  auditLog?: (event: { tenantId: string; query: string }) => void;
}

export class TenantScopeLimiterAdapter extends BasePolicyAdapter {
  readonly name = 'tenant-scope-limiter';
  private readonly allowedTenants: ReadonlySet<string>;
  private readonly auditLog?: (event: { tenantId: string; query: string }) => void;

  constructor(options: TenantScopeLimiterOptions) {
    super();
    this.allowedTenants = new Set(options.allowedTenants);
    this.auditLog = options.auditLog;
  }

  protected shouldApply(context: ReadonlyQueryContext): boolean {
    return !this.allowedTenants.has(context.tenantId);
  }

  protected apply(context: ReadonlyQueryContext): AdapterEvaluation {
    this.auditLog?.({ tenantId: context.tenantId, query: context.query });
    return {
      action: 'deny',
      explanation: `Tenant ${context.tenantId} is outside the permitted scope for this retriever.`,
      metadata: {
        tenantId: context.tenantId,
      },
    };
  }
}

export default TenantScopeLimiterAdapter;
