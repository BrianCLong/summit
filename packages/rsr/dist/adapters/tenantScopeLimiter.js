 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { BasePolicyAdapter } from './base.js';







export class TenantScopeLimiterAdapter extends BasePolicyAdapter {
   __init() {this.name = 'tenant-scope-limiter'}
  
  

  constructor(options) {
    super();TenantScopeLimiterAdapter.prototype.__init.call(this);;
    this.allowedTenants = new Set(options.allowedTenants);
    this.auditLog = options.auditLog;
  }

   shouldApply(context) {
    return !this.allowedTenants.has(context.tenantId);
  }

   apply(context) {
    _optionalChain([this, 'access', _ => _.auditLog, 'optionalCall', _2 => _2({ tenantId: context.tenantId, query: context.query })]);
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
