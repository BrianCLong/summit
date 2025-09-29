import crypto from 'crypto';

export type Subject = { id: string; roles: string[]; attrs?: Record<string, unknown> };
export type Resource = { type: string; id: string; ownerId?: string; tenantId: string; attrs?: Record<string, unknown> };
export type Decision = { allowed: boolean; reason?: string; obligations?: Record<string, unknown> };

type Rule = {
  id: string;
  effect: 'allow' | 'deny';
  when: {
    roles?: string[];
    actions?: string[];
    resourceTypes?: string[];
    conditions?: Array<{ key: string; op: 'eq'|'neq'|'in'|'contains'|'gte'|'lte'; value: any }>;
  };
  reason?: string;
};

export class PolicyEngine {
  constructor(private rules: Rule[]) {}

  evaluate(input: { subject: Subject; action: string; resource: Resource }): Decision {
    const matches = (r: Rule) => {
      const { roles, actions, resourceTypes, conditions } = r.when;
      if (roles && !roles.some(x => input.subject.roles.includes(x))) return false;
      if (actions && !actions.includes(input.action)) return false;
      if (resourceTypes && !resourceTypes.includes(input.resource.type)) return false;
      if (conditions) {
        for (const c of conditions) {
          const val = this.lookup(c.key, input);
          if (!this.compare(val, c.op, c.value)) return false;
        }
      }
      return true;
    };

    // First matching deny wins, then first allow
    const deny = this.rules.find(r => r.effect === 'deny' && matches(r));
    if (deny) return { allowed: false, reason: deny.reason || `Policy ${deny.id} denied` };

    const allow = this.rules.find(r => r.effect === 'allow' && matches(r));
    if (allow) return { allowed: true };

    return { allowed: false, reason: 'No matching allow policy' };
  }

  private lookup(path: string, ctx: any) {
    return path.split('.').reduce((o, k) => (o ? o[k] : undefined), ctx);
  }
  private compare(a: any, op: Rule['when']['conditions'][number]['op'], b: any) {
    switch (op) {
      case 'eq': return a === b;
      case 'neq': return a !== b;
      case 'in': return Array.isArray(b) && b.includes(a);
      case 'contains': return Array.isArray(a) ? a.includes(b) : (typeof a === 'string' && a.includes(b));
      case 'gte': return a >= b;
      case 'lte': return a <= b;
      default: return false;
    }
  }
}

export const defaultRules: Rule[] = [
  { id: 'deny-non-tenant', effect: 'deny', when: { conditions: [{ key: 'subject.attrs.tenantId', op: 'neq', value: { ref: 'resource.tenantId' } as any }] }, reason: 'Cross-tenant access blocked' },
  { id: 'allow-owner-analyst', effect: 'allow', when: { roles: ['analyst'], actions: ['read','update'], resourceTypes: ['case'], conditions: [{ key: 'resource.ownerId', op: 'eq', value: { ref: 'subject.id' } as any }] } },
  { id: 'allow-admin', effect: 'allow', when: { roles: ['admin'] } },
];
