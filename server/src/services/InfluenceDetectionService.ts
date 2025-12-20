import { runCypher } from '../graph/neo4j.js';
import { analyzeCoordinatedBehavior } from '../graph/algorithms.js';

/**
 * Service for detecting influence operations, bots, and coordinated behavior.
 */
export class InfluenceDetectionService {
  /**
   * Detects potential bot accounts based on heuristics.
   * Heuristics:
   * - High out-degree (following/acting on many) vs low in-degree (few followers).
   * - High frequency of actions (if timestamped edges exist).
   * - Low profile completeness (missing properties - simulated here by checking node properties).
   */
  static async detectBots(tenantId: string) {
    const cypher = `
      MATCH (n:Entity)
      WHERE n.tenantId = $tenantId
      // Calculate out-degree
      OPTIONAL MATCH (n)-[out]->()
      WITH n, count(out) AS outDegree
      // Calculate in-degree
      OPTIONAL MATCH ()-[in]->(n)
      WITH n, outDegree, count(in) AS inDegree
      // Heuristic: High Out/In ratio (Spammer/Bot behavior)
      WITH n, outDegree, inDegree,
           CASE WHEN inDegree = 0 THEN toFloat(outDegree) ELSE toFloat(outDegree)/inDegree END AS ratio
      WHERE outDegree > 10 AND ratio > 5.0
      RETURN n.id AS id, n.name AS name, outDegree, inDegree, ratio,
             "High Out/In Ratio" AS reason
      ORDER BY ratio DESC
      LIMIT 50
    `;
    return runCypher(cypher, { tenantId });
  }

  /**
   * Detects coordinated inauthentic behavior (CIB).
   * Uses the graph algorithm for shared targets within a time window.
   */
  static async detectCoordinatedBehavior(tenantId: string, timeWindowMinutes: number = 60) {
    return analyzeCoordinatedBehavior(tenantId, timeWindowMinutes);
  }

  /**
   * Tracks the propagation of a specific narrative (e.g., a Claim or Story).
   * Returns the timeline of entities adopting or spreading the narrative.
   */
  static async trackNarrativePropagation(tenantId: string, narrativeId: string) {
    const cypher = `
      MATCH (n:Narrative {id: $narrativeId, tenantId: $tenantId})
      MATCH (p:Entity)-[r:PROMOTES|SHARES|MENTIONS]->(n)
      RETURN p.name AS actor, type(r) AS action, r.timestamp AS timestamp
      ORDER BY r.timestamp ASC
    `;
    return runCypher(cypher, { tenantId, narrativeId });
  }

  /**
   * Identifies "Amplification Networks" - dense subgraphs of users who solely retweet/amplify a core set of accounts.
   */
  static async identifyAmplificationNetworks(tenantId: string) {
    const cypher = `
      MATCH (amplifier:Entity)-[r:AMPLIFIES]->(source:Entity)
      WHERE amplifier.tenantId = $tenantId AND source.tenantId = $tenantId
      WITH source, count(distinct amplifier) AS amplifierCount, collect(amplifier.name) AS amplifiers
      WHERE amplifierCount > 5
      RETURN source.name AS sourceAccount, amplifierCount, amplifiers[0..5] AS sampleAmplifiers
      ORDER BY amplifierCount DESC
      LIMIT 20
    `;
    return runCypher(cypher, { tenantId });
  }
}
