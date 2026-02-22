import { Driver } from 'neo4j-driver';
export class ATGGraphQuery {
  constructor(private driver: Driver) {}
  async getActorActivities(tenant_id: string, actor_id: string) {
    if (!tenant_id) throw new Error('tenant_id is required');
    const session = this.driver.session();
    try {
      const result = await session.executeRead(tx => tx.run(`
        MATCH (a:ATGIdentity { tenant_id: $tenant_id, id: $actor_id })
        MATCH (a)-[r:PERFORMED { tenant_id: $tenant_id }]->(asset:ATGAsset)
        RETURN a, r, asset
      `, { tenant_id, actor_id }));
      return result.records.map(record => record.toObject());
    } finally { await session.close(); }
  }
}
