import { Tenant } from './types.js';
import { randomUUID } from 'crypto';
import { evaluateGovernancePolicy } from '@intelgraph/governance-kernel';
import { GraphPersistenceAdapter } from '@intelgraph/core';

export class TenantRegistry {
  private tenants: Map<string, Tenant> = new Map();

  constructor(private graphAdapter: GraphPersistenceAdapter) {}

  async createTenant(
    name: string,
    modules: string[],
    region: string
  ): Promise<Tenant | null> {
    // Governance Check: Tenant Onboarding
    const govDecision = evaluateGovernancePolicy('analytics', {
      tenantId: 'system',
      action: 'CREATE_TENANT',
      resource: name,
      params: { region, modules }
    });

    if (govDecision.outcome === 'DENIED') {
      throw new Error(`Tenant creation denied: ${govDecision.reason}`);
    }

    const tenant: Tenant = {
      id: randomUUID(),
      name,
      modules,
      region,
      slaTier: 'STANDARD',
      createdAt: new Date()
    };

    this.tenants.set(tenant.id, tenant);

    // Add to Graph
    await this.graphAdapter.addNode({
      id: tenant.id,
      label: 'Tenant',
      properties: { name: tenant.name, region: tenant.region }
    });

    return tenant;
  }

  getTenant(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }

  listTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }
}
