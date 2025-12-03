import { getPostgresPool } from '../db/postgres';
import { getNeo4jDriver, neo } from '../db/neo4j';
import logger from '../config/logger';
import {
  graphDriftCount,
  orphanNodesCount,
  missingNodesCount,
  propertyMismatchCount,
  consistencyCheckDuration,
  repairOperationsTotal,
} from '../metrics/graph_consistency';
import { performance } from 'perf_hooks';

interface ConsistencyReport {
  timestamp: string;
  summary: {
    total_entities_checked: number;
    total_drift_detected: number;
    missing_in_neo4j: number;
    orphans_in_neo4j: number;
    property_mismatches: number;
    orphan_edges: number;
  };
  details: {
    missing_ids: string[];
    orphan_ids: string[];
    mismatches: Array<{ id: string; diff: any }>;
    orphan_edges: Array<{ id: string; type: string; from: string; to: string }>;
  };
  actions_taken: string[];
}

export class GraphConsistencyService {
  private static instance: GraphConsistencyService;
  private pgPool = getPostgresPool();
  private neo4jDriver = getNeo4jDriver();

  private constructor() {}

  public static getInstance(): GraphConsistencyService {
    if (!GraphConsistencyService.instance) {
      GraphConsistencyService.instance = new GraphConsistencyService();
    }
    return GraphConsistencyService.instance;
  }

  /**
   * Run a full consistency check between Postgres and Neo4j.
   * @param autoRepair Safe repair mode (create missing, sync props).
   * @param pruneOrphans Unsafe repair mode (delete Neo4j orphans).
   */
  public async validateConsistency(
    autoRepair: boolean = false,
    pruneOrphans: boolean = false
  ): Promise<ConsistencyReport> {
    const start = performance.now();
    logger.info('Starting graph consistency check...');

    const report: ConsistencyReport = {
      timestamp: new Date().toISOString(),
      summary: {
        total_entities_checked: 0,
        total_drift_detected: 0,
        missing_in_neo4j: 0,
        orphans_in_neo4j: 0,
        property_mismatches: 0,
        orphan_edges: 0,
      },
      details: {
        missing_ids: [],
        orphan_ids: [],
        mismatches: [],
        orphan_edges: [],
      },
      actions_taken: [],
    };

    try {
      // 1. Fetch all entities from Postgres (Source of Truth)
      const pgQuery = `
        SELECT id, type, props, created_at, updated_at
        FROM entities
        WHERE id IS NOT NULL
      `;

      const pgResult = await this.pgPool.read(pgQuery);
      const pgEntities = new Map(pgResult.rows.map((r: any) => [r.id, r]));
      // Optimized Set for fast existence checks
      const validPgIds = new Set(pgEntities.keys());

      report.summary.total_entities_checked = pgEntities.size;

      // 2. Fetch all Entity nodes from Neo4j
      const neoSession = this.neo4jDriver.session();
      // Fetch nodes
      const neoResult = await neoSession.run(`
        MATCH (n:Entity)
        RETURN n.id as id, labels(n) as labels, properties(n) as props
      `);

      const neoEntities = new Map();
      neoResult.records.forEach((record: any) => {
        const id = record.get('id');
        if (id) {
          neoEntities.set(id, {
            id,
            labels: record.get('labels'),
            props: record.get('props'),
          });
        }
      });

      // 3. Detect Missing Nodes (In PG, not in Neo4j)
      for (const [id, pgEntity] of pgEntities) {
        if (!neoEntities.has(id)) {
          report.summary.missing_in_neo4j++;
          report.details.missing_ids.push(id);
          missingNodesCount.labels(pgEntity.type || 'unknown').inc();

          if (autoRepair) {
            await this.createMissingNode(pgEntity);
            report.actions_taken.push(`Created Neo4j node for ${id}`);
          }
        } else {
          // Check for Property Mismatches
          const neoEntity = neoEntities.get(id);
          const mismatch = this.checkPropertyMismatch(pgEntity, neoEntity);
          if (mismatch) {
            report.summary.property_mismatches++;
            report.details.mismatches.push({ id, diff: mismatch });
            propertyMismatchCount.labels(pgEntity.type || 'unknown').inc();

            if (autoRepair) {
              await this.syncNodeProperties(id, pgEntity);
              report.actions_taken.push(`Synced properties for ${id}`);
            }
          }
        }
      }

      // 4. Detect Orphan Nodes (In Neo4j, not in PG)
      for (const [id, neoEntity] of neoEntities) {
        if (!validPgIds.has(id)) {
          report.summary.orphans_in_neo4j++;
          report.details.orphan_ids.push(id);

          const mainLabel = neoEntity.labels.find((l: string) => l !== 'Entity') || 'Entity';
          orphanNodesCount.labels(mainLabel).inc();

          // We will delete them later if pruneOrphans is true
        }
      }

      // 5. Detect Orphan Edges
      // Definition: Edges where one or both endpoints are NOT in the validPgIds set.
      // Since we already know which Neo4j nodes are orphans (not in validPgIds),
      // edges connected to them are implicitly orphans.
      // However, we can also check for edges connected to *missing* nodes (though that shouldn't happen in Neo4j if they don't exist).
      // The main case is: Edge exists, but one of the nodes is about to be deleted (orphan).

      // Let's explicitly look for edges connected to orphan nodes to report them.
      if (report.details.orphan_ids.length > 0) {
        const orphanIds = report.details.orphan_ids;
        // Batch this if large, but for now...
        const edgeResult = await neoSession.run(`
          MATCH (n:Entity)-[r]-(m)
          WHERE n.id IN $orphanIds
          RETURN elementId(r) as id, type(r) as type, n.id as from, m.id as to
          LIMIT 1000
        `, { orphanIds });

        edgeResult.records.forEach((rec: any) => {
           report.details.orphan_edges.push({
             id: rec.get('id'),
             type: rec.get('type'),
             from: rec.get('from'),
             to: rec.get('to')
           });
        });
        report.summary.orphan_edges = report.details.orphan_edges.length; // Approximate
      }

      // Prune orphans if requested (this removes connected edges too)
      if (pruneOrphans && report.details.orphan_ids.length > 0) {
        for (const id of report.details.orphan_ids) {
           await this.deleteOrphanNode(id);
           report.actions_taken.push(`Deleted orphan node ${id}`);
        }
      }

      await neoSession.close();

      // 6. Update Aggregate Metrics
      report.summary.total_drift_detected =
        report.summary.missing_in_neo4j +
        report.summary.orphans_in_neo4j +
        report.summary.property_mismatches;

      graphDriftCount.labels('missing', 'critical').set(report.summary.missing_in_neo4j);
      graphDriftCount.labels('orphan', 'warning').set(report.summary.orphans_in_neo4j);
      graphDriftCount.labels('mismatch', 'warning').set(report.summary.property_mismatches);

    } catch (error) {
      logger.error('Graph consistency check failed', error);
      throw error;
    } finally {
      const duration = (performance.now() - start) / 1000;
      consistencyCheckDuration.set(duration);
      logger.info({ duration, summary: report.summary }, 'Graph consistency check completed');
    }

    return report;
  }

  private checkPropertyMismatch(pgEntity: any, neoEntity: any): any | null {
    const pgType = pgEntity.type;
    const neoLabels = neoEntity.labels;
    const diff: any = {};
    let hasDiff = false;

    // 1. Label Check
    if (pgType && !neoLabels.includes(pgType)) {
      diff.expectedLabel = pgType;
      diff.actualLabels = neoLabels;
      hasDiff = true;
    }

    // 2. Core Timestamps Check
    // Convert to ISO string for comparison as PG driver returns Date objects usually
    const pgCreated = pgEntity.created_at ? new Date(pgEntity.created_at).toISOString() : null;
    const pgUpdated = pgEntity.updated_at ? new Date(pgEntity.updated_at).toISOString() : null;
    const neoCreated = neoEntity.props.created_at || null;
    const neoUpdated = neoEntity.props.updated_at || null;

    if (pgCreated !== neoCreated) {
       diff.created_at = { pg: pgCreated, neo: neoCreated };
       hasDiff = true;
    }
    if (pgUpdated !== neoUpdated) {
       diff.updated_at = { pg: pgUpdated, neo: neoUpdated };
       hasDiff = true;
    }

    // 3. Properties Check
    // Compare specific props from JSONB if mapped.
    // For now, checking equality of common fields if they exist in props
    if (pgEntity.props) {
       for (const key of Object.keys(pgEntity.props)) {
          const pgVal = pgEntity.props[key];
          const neoVal = neoEntity.props[key];
          // Simple strict equality for primitives
          if (pgVal !== neoVal && JSON.stringify(pgVal) !== JSON.stringify(neoVal)) {
             diff[key] = { pg: pgVal, neo: neoVal };
             hasDiff = true;
          }
       }
    }

    return hasDiff ? diff : null;
  }

  private sanitizeLabel(label: string): string {
    // Basic sanitization to prevent injection
    // Allow only alphanumeric and underscores
    return label.replace(/[^a-zA-Z0-9_]/g, '');
  }

  private async createMissingNode(pgEntity: any) {
    const session = this.neo4jDriver.session();
    try {
      const label = this.sanitizeLabel(pgEntity.type || 'Entity');

      const properties = {
        id: pgEntity.id,
        created_at: pgEntity.created_at ? new Date(pgEntity.created_at).toISOString() : null,
        updated_at: pgEntity.updated_at ? new Date(pgEntity.updated_at).toISOString() : null,
        ...pgEntity.props
      };

      // Use string interpolation for label (sanitized) but params for properties
      await session.run(
        `
        MERGE (n:Entity {id: $id})
        SET n :${label}
        SET n += $props
        `,
        { id: pgEntity.id, props: properties }
      );
      repairOperationsTotal.labels('create_node', 'success').inc();
    } catch (err) {
      logger.error({ err, entityId: pgEntity.id }, 'Failed to create missing Neo4j node');
      repairOperationsTotal.labels('create_node', 'failed').inc();
    } finally {
      await session.close();
    }
  }

  private async syncNodeProperties(id: string, pgEntity: any) {
    const session = this.neo4jDriver.session();
    try {
      const label = this.sanitizeLabel(pgEntity.type || 'Entity');
      const properties = {
        created_at: pgEntity.created_at ? new Date(pgEntity.created_at).toISOString() : null,
        updated_at: pgEntity.updated_at ? new Date(pgEntity.updated_at).toISOString() : null,
        ...pgEntity.props
      };

      // We re-apply the label just in case it was the mismatch
      await session.run(
        `
        MATCH (n:Entity {id: $id})
        SET n :${label}
        SET n += $props
        `,
        { id, props: properties }
      );
      repairOperationsTotal.labels('sync_props', 'success').inc();
    } catch (err) {
      logger.error({ err, entityId: id }, 'Failed to sync Neo4j node properties');
      repairOperationsTotal.labels('sync_props', 'failed').inc();
    } finally {
      await session.close();
    }
  }

  private async deleteOrphanNode(id: string) {
    const session = this.neo4jDriver.session();
    try {
      await session.run(
        `
        MATCH (n:Entity {id: $id})
        DETACH DELETE n
        `,
        { id }
      );
      repairOperationsTotal.labels('delete_orphan', 'success').inc();
    } catch (err) {
      logger.error({ err, entityId: id }, 'Failed to delete orphan Neo4j node');
      repairOperationsTotal.labels('delete_orphan', 'failed').inc();
    } finally {
      await session.close();
    }
  }
}
