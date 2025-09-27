import { BasePolicyAdapter } from './base.js';
import type { AdapterEvaluation, ReadonlyQueryContext } from '../types.js';
export interface TenantScopeLimiterOptions {
    allowedTenants: ReadonlyArray<string>;
    auditLog?: (event: {
        tenantId: string;
        query: string;
    }) => void;
}
export declare class TenantScopeLimiterAdapter extends BasePolicyAdapter {
    readonly name = "tenant-scope-limiter";
    private readonly allowedTenants;
    private readonly auditLog?;
    constructor(options: TenantScopeLimiterOptions);
    protected shouldApply(context: ReadonlyQueryContext): boolean;
    protected apply(context: ReadonlyQueryContext): AdapterEvaluation;
}
export default TenantScopeLimiterAdapter;
//# sourceMappingURL=tenantScopeLimiter.d.ts.map