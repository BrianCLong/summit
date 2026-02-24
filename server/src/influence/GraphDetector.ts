
import { Driver } from 'neo4j-driver';
import { AnomalyDetectionResult } from './types';

export class GraphDetector {
  private driver: Driver;

  constructor(driver: Driver) {
    this.driver = driver;
  }

  /**
   * Detects cliques of actors who interact excessively with each other but not outside.
   * This often indicates a botnet or echo chamber.
   */
  public async detectCoordinatedCliques(actorIds: string[]): Promise<AnomalyDetectionResult> {
      const session = this.driver.session();
      try {
          // Cypher query to find density of subgraph for these actors
          // Assuming 'INTERACTED_WITH' relationship
          const query = `
            MATCH (a:Actor)-[r:INTERACTED_WITH]->(b:Actor)
            WHERE a.id IN $actorIds AND b.id IN $actorIds
            WITH count(r) as internalInteractions, count(distinct a) as actorCount
            RETURN internalInteractions, actorCount
          `;

          const result = await session.run(query, { actorIds });
          if (result.records.length === 0) return { isAnomalous: false, score: 0, reason: 'No data' };

          const record = result.records[0];
          const internalInteractions = record.get('internalInteractions').toNumber();
          const actorCount = record.get('actorCount').toNumber();

          if (actorCount < 2) return { isAnomalous: false, score: 0, reason: 'Insufficient actors' };

          const maxPossible = actorCount * (actorCount - 1); // Directed
          const density = internalInteractions / maxPossible;

          if (density > 0.5 && actorCount > 5) {
               return {
                   isAnomalous: true,
                   score: density,
                   reason: `High interaction density (${density.toFixed(2)}) among ${actorCount} actors`,
               };
          }

          return { isAnomalous: false, score: density, reason: 'Normal density' };

      } catch (error: any) {
          console.error('Graph detection error:', error);
          return { isAnomalous: false, score: 0, reason: 'Error executing query' };
      } finally {
          if (session?.close) {
            await session.close();
          }
      }
  }

  /**
   * Tracks the cascade of influence for a specific post or narrative.
   * returns the depth and breadth of the tree.
   */
  public async analyzeInfluenceCascade(rootPostId: string): Promise<{ depth: number, breadth: number }> {
      const session = this.driver.session();
      try {
        // Find path length from root post via SHARED/QUOTED relationships
        const query = `
            MATCH p=(root:Post {id: $rootPostId})<-[:SHARED|QUOTED*]-(leaf:Post)
            RETURN length(p) as depth, count(leaf) as count
            ORDER BY depth DESC
            LIMIT 1
        `;
        const result = await session.run(query, { rootPostId });
        if (result.records.length === 0) return { depth: 0, breadth: 0 };

        const depth = result.records[0].get('depth').toNumber();

        // Count total nodes in tree for breadth (approximation)
        const countQuery = `
             MATCH (root:Post {id: $rootPostId})<-[:SHARED|QUOTED*]-(leaf:Post)
             RETURN count(leaf) as breadth
        `;
        const countResult = await session.run(countQuery, { rootPostId });
        const breadth = countResult.records[0].get('breadth').toNumber();

        return { depth, breadth };

      } catch (error: any) {
         console.error('Cascade analysis error:', error);
         return { depth: 0, breadth: 0 };
      } finally {
          if (session?.close) {
            await session.close();
          }
      }
  }
}
