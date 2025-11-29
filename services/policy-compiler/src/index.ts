import yaml from 'js-yaml';
import { z } from 'zod';

// Policy Schema
export const PolicySchema = z.object({
  name: z.string(),
  version: z.string(),
  licenses: z.array(z.string()).optional(),
  warrants: z.array(z.string()).optional(),
  dataPurpose: z.array(z.string()),
  retention: z.string().optional(),
  clearance: z.enum(['PUBLIC', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
  rules: z.array(z.object({
    resource: z.string(),
    action: z.enum(['read', 'write', 'export', 'delete']),
    allow: z.boolean(),
    conditions: z.record(z.any()).optional(),
  })),
});

export type Policy = z.infer<typeof PolicySchema>;

export class PolicyCompiler {
  private policies: Map<string, Policy> = new Map();

  loadFromYAML(yamlContent: string): Policy {
    const parsed = yaml.load(yamlContent);
    const policy = PolicySchema.parse(parsed);
    this.policies.set(policy.name, policy);
    return policy;
  }

  evaluate(policyName: string, context: { resource: string; action: string; user: any }): { allowed: boolean; reason: string } {
    const policy = this.policies.get(policyName);
    if (!policy) return { allowed: false, reason: 'Policy not found' };

    const rule = policy.rules.find(r => r.resource === context.resource && r.action === context.action);
    if (!rule) return { allowed: false, reason: 'No matching rule' };

    if (!rule.allow) return { allowed: false, reason: 'Rule denies action' };

    // Check clearance
    if (context.user.clearance && !this.checkClearance(context.user.clearance, policy.clearance)) {
      return { allowed: false, reason: 'Insufficient clearance' };
    }

    return { allowed: true, reason: 'Policy allows action' };
  }

  private checkClearance(userClearance: string, required: string): boolean {
    const levels = ['PUBLIC', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
    return levels.indexOf(userClearance) >= levels.indexOf(required);
  }

  simulate(policyName: string, queries: Array<{ resource: string; action: string }>): Array<{ query: any; allowed: boolean; reason: string }> {
    return queries.map(q => ({
      query: q,
      ...this.evaluate(policyName, { ...q, user: { clearance: 'PUBLIC' } }),
    }));
  }

  diff(policyName1: string, policyName2: string): { added: any[]; removed: any[]; modified: any[] } {
    const p1 = this.policies.get(policyName1);
    const p2 = this.policies.get(policyName2);
    if (!p1 || !p2) throw new Error('Policies not found');

    return {
      added: p2.rules.filter(r2 => !p1.rules.some(r1 => r1.resource === r2.resource && r1.action === r2.action)),
      removed: p1.rules.filter(r1 => !p2.rules.some(r2 => r2.resource === r1.resource && r2.action === r1.action)),
      modified: [],
    };
  }
}

export function middleware(policyName: string, compiler: PolicyCompiler) {
  return (req: any, res: any, next: any) => {
    const result = compiler.evaluate(policyName, {
      resource: req.path,
      action: req.method.toLowerCase(),
      user: req.user || {},
    });
    if (!result.allowed) {
      res.status(403).json({ error: 'Forbidden', reason: result.reason });
      return;
    }
    next();
  };
}
