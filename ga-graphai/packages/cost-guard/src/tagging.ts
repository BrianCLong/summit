export interface ResourceDefinition {
  id: string;
  type: string;
  tags: Record<string, string | undefined>;
}

const REQUIRED_TAGS = ['tenant', 'env', 'service', 'owner', 'cost_center'];

export interface TagValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateTags(resource: ResourceDefinition): TagValidationResult {
  const missing = REQUIRED_TAGS.filter((tag) => !resource.tags[tag]);
  return { valid: missing.length === 0, missing };
}

export interface BudgetAlert {
  tenantId: string;
  threshold: number;
  current: number;
  level: 'warning' | 'critical';
}

export function evaluateBudget(tenantId: string, budget: number, spend: number): BudgetAlert | null {
  const ratio = spend / budget;
  if (ratio >= 1) {
    return { tenantId, threshold: 1, current: ratio, level: 'critical' };
  }
  if (ratio >= 0.9) {
    return { tenantId, threshold: 0.9, current: ratio, level: 'warning' };
  }
  if (ratio >= 0.8) {
    return { tenantId, threshold: 0.8, current: ratio, level: 'warning' };
  }
  return null;
}

export function costPerActiveTenant(spendByTenant: Record<string, number>, activeTenants: string[]): number {
  const total = activeTenants.reduce((acc, tenant) => acc + (spendByTenant[tenant] ?? 0), 0);
  return activeTenants.length ? total / activeTenants.length : 0;
}
