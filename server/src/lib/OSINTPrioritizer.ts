import { getNeo4jDriver } from '../config/database';
import { enqueueOSINT } from '../services/OSINTQueueService';
import logger from '../utils/logger';

interface PrioritizationConfig {
  minDegree: number;
  maxPending: number;
  scanLimit: number;
}

export class OSINTPrioritizationService {
  private driver;
  private config: PrioritizationConfig;

  constructor(config: Partial<PrioritizationConfig> = {}) {
    this.driver = getNeo4jDriver();
    this.config = {
      minDegree: config.minDegree || 2,
      maxPending: config.maxPending || 100,
      scanLimit: config.scanLimit || 50,
    };
  }

  /**
   * Scans the graph for high-priority entities that need OSINT enrichment.
   * Priority is determined by:
   * 1. Centrality (degree) - connected nodes are more important.
   * 2. Completeness - missing key properties (e.g., summary, source).
   * 3. Veracity - low or missing veracity score.
   */
  async identifyTargets(tenantId?: string): Promise<string[]> {
    const session = this.driver.session();
    try {
      // Cypher to find nodes with high degree but missing 'veracityScore' or 'summary'
      const query = `
        MATCH (n:Entity)
        WHERE (n.veracityScore IS NULL OR n.summary IS NULL)
        ${tenantId ? 'AND n.tenantId = $tenantId' : ''}
        WITH n, size((n)--()) as degree
        WHERE degree >= $minDegree
        RETURN n.id as id, degree
        ORDER BY degree DESC
        LIMIT $scanLimit
      `;

      const result = await session.run(query, {
        minDegree: this.config.minDegree,
        scanLimit: this.config.scanLimit,
        tenantId,
      });

      return result.records.map((r) => r.get('id'));
    } catch (error) {
      logger.error('Failed to identify OSINT targets', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Runs a prioritization cycle: finds targets and queues them for ingestion.
   */
  async runPrioritizationCycle(tenantId?: string) {
    logger.info('Starting OSINT prioritization cycle...');
    const targets = await this.identifyTargets(tenantId);
    logger.info(`Identified ${targets.length} targets for enrichment.`);

    for (const targetId of targets) {
      // For now, we assume we want to enrich via 'wikipedia' as a default,
      // or we could use a generic 'search' strategy.
      // We will queue a 'comprehensive_scan' job.
      await enqueueOSINT('comprehensive_scan', targetId, { tenantId });
    }

    return targets;
  }
}
