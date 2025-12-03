import { getNeo4jDriver, getPostgresPool } from '../config/database';
import logger from '../utils/logger';

export type FeatureVector = Record<string, number>;

export class FeatureStore {
  /**
   * Aggregates features per entity over 24h/7d/30d.
   * Fetches data from Neo4j (Graph), Postgres (Time/Audit), and derived attributes.
   *
   * @param entityId - The ID of the entity to fetch features for.
   * @param _window - The time window (unused for now as features have fixed windows).
   */
  async getFeatures(
    entityId: string,
    _window: '24h' | '7d' | '30d',
  ): Promise<FeatureVector> {
    const driver = getNeo4jDriver();
    const pool = getPostgresPool();
    const session = driver.session();

    try {
      // 1. Graph Metrics (Neo4j)
      // Fetch degree, case links, and OSINT hits (vt_positives)
      const graphQuery = `
        MATCH (n:Entity {id: $id})
        OPTIONAL MATCH (n)-[r]-(m)
        WITH n, count(DISTINCT m) as degree
        OPTIONAL MATCH (n)--(c:Investigation)
        RETURN
          degree,
          count(DISTINCT c) as caseLinks,
          n.vt_positives as vtHits,
          n.createdAt as createdAt,
          n.risk_score as existingRisk
      `;

      const graphRes = await session.run(graphQuery, { id: entityId });
      const record = graphRes.records[0];

      let degree = 0;
      let caseLinks = 0;
      let vtHits = 0;
      let isRecent = 0;

      if (record) {
        degree = record.get('degree') ? record.get('degree').toNumber() : 0;
        caseLinks = record.get('caseLinks') ? record.get('caseLinks').toNumber() : 0;
        vtHits = record.get('vtHits') ? record.get('vtHits').toNumber() : 0;

        const createdAt = record.get('createdAt');
        if (createdAt) {
          // Handle both Neo4j DateTime and string
          const createdTime = typeof createdAt === 'string'
            ? new Date(createdAt).getTime()
            : new Date(createdAt.toString()).getTime();

          const now = Date.now();
          const diffHours = (now - createdTime) / (1000 * 60 * 60);
          // If created in the last 24h, it's considered recent for this feature
          if (diffHours < 24) isRecent = 1;
        }
      }

      // 2. Temporal/Audit Metrics (Postgres)
      // Count events in last 24h to detect spikes
      const auditQuery = `
        SELECT count(*) as count
        FROM audit_logs
        WHERE resource_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
      `;

      let eventCount = 0;
      try {
        const auditRes = await pool.query(auditQuery, [entityId]);
        if (auditRes.rows.length > 0) {
          eventCount = parseInt(auditRes.rows[0].count, 10);
        }
      } catch (pgError) {
        logger.warn('Failed to fetch audit logs for risk scoring', { error: pgError });
        // Continue with 0 events
      }

      // Simple anomaly proxy: raw count normalized (capped at 100 for normalization)
      // In a full system, this would compare against a historical baseline (Z-score).
      const temporalAnomaly = Math.min(eventCount, 100) / 100;

      // 3. Alerts / Text Analysis
      // For now, we assume 0 unless we integrate a specific Alerts table.
      // Future: Integration with ContentAnalyzer results stored in Postgres/Neo4j.
      const alerts = 0;

      return {
        alerts_24h: alerts,
        vt_hits_7d: vtHits, // OSINT: VirusTotal hits
        case_links_30d: caseLinks, // Graph: Connections to investigations
        temporal_anomaly_24h: temporalAnomaly, // Time: Activity spike
        centrality_30d: degree, // Graph: Centrality
        first_seen_recent: isRecent, // Time: New entity
      };

    } catch (error) {
      logger.error('Error fetching features for entity', { entityId, error });
      // Return safe defaults on error to allow partial scoring
      return {
        alerts_24h: 0,
        vt_hits_7d: 0,
        case_links_30d: 0,
        temporal_anomaly_24h: 0,
        centrality_30d: 0,
        first_seen_recent: 0,
      };
    } finally {
      await session.close();
    }
  }
}
