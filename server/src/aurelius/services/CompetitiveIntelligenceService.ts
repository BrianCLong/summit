
import { getNeo4jDriver } from '../../config/database';

export class CompetitiveIntelligenceService {
  private static instance: CompetitiveIntelligenceService;

  private constructor() {}

  static getInstance(): CompetitiveIntelligenceService {
    if (!CompetitiveIntelligenceService.instance) {
      CompetitiveIntelligenceService.instance = new CompetitiveIntelligenceService();
    }
    return CompetitiveIntelligenceService.instance;
  }

  async addCompetitor(name: string, type: string, tenantId: string): Promise<void> {
      const driver = getNeo4jDriver();
      const session = driver.session();
      try {
          await session.run(`
            MERGE (c:CompetitiveEntity {name: $name, tenantId: $tenantId})
            SET c.type = $type, c:AureliusNode
          `, { name, type, tenantId });
      } finally {
          await session.close();
      }
  }

  async getMarketMap(tenantId: string): Promise<any> {
      // Return a graph of competitors and their patent clusters
      const driver = getNeo4jDriver();
      const session = driver.session();
      try {
          const result = await session.run(`
            MATCH (c:CompetitiveEntity {tenantId: $tenantId})
            OPTIONAL MATCH (c)-[:OWNS]->(p:Patent)
            OPTIONAL MATCH (p)-[:BELONGS_TO]->(cluster:PriorArtCluster)
            RETURN c.name as competitor, count(p) as patentCount, collect(distinct cluster.name) as domains
          `, { tenantId });

          return result.records.map(r => ({
              competitor: r.get('competitor'),
              patentCount: r.get('patentCount').toNumber(),
              domains: r.get('domains')
          }));
      } finally {
          await session.close();
      }
  }
}
