import { Driver } from 'neo4j-driver';

export class ATGGraphQuery {
  constructor(private driver: Driver) {}

  /**
   * Retrieves activities for a specific actor, strictly scoped to a tenant.
   */
  async getActorActivities(tenant_id: string, actor_id: string) {
    if (!tenant_id) throw new Error('tenant_id is required for ATG queries');

    const session = this.driver.session();
    try {
      const result = await session.executeRead(tx => tx.run(`
        MATCH (a:ATGIdentity { tenant_id: $tenant_id, id: $actor_id })
        MATCH (a)-[r:PERFORMED { tenant_id: $tenant_id }]->(asset:ATGAsset)
        RETURN a, r, asset
        ORDER BY r.event_time DESC
      `, { tenant_id, actor_id }));

      return result.records.map(record => ({
        actor: record.get('a').properties,
        relationship: record.get('r').properties,
        asset: record.get('asset').properties
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Finds potential lateral movement patterns (simple heuristic for v0).
   */
  async findPotentialLateralMovement(tenant_id: string) {
    if (!tenant_id) throw new Error('tenant_id is required for ATG queries');

    const session = this.driver.session();
    try {
      const result = await session.executeRead(tx => tx.run(`
        MATCH (a:ATGIdentity { tenant_id: $tenant_id })-[r1:PERFORMED { tenant_id: $tenant_id }]->(asset1:ATGAsset)
        MATCH (a)-[r2:PERFORMED { tenant_id: $tenant_id }]->(asset2:ATGAsset)
        WHERE asset1.id <> asset2.id AND r2.event_time > r1.event_time
        RETURN a, r1, asset1, r2, asset2
        LIMIT 100
      `, { tenant_id }));

      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }
}
