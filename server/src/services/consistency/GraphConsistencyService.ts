
import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
import logger from '../../config/logger.js';
import { randomUUID as uuidv4 } from 'crypto';

export interface ConsistencyReport {
  investigationId: string;
  tenantId: string;
  postgresEntityCount: number;
  neo4jEntityCount: number;
  postgresRelationshipCount: number;
  neo4jRelationshipCount: number;
  postgresEntitiesMissingInNeo4j: string[];
  neo4jEntitiesMissingInPostgres: string[];
  postgresRelationshipsMissingInNeo4j: string[]; // Added
  neo4jRelationshipsMissingInPostgres: string[]; // Added
  indexesStatus: {
    neo4jNodeIndex: boolean;
    neo4jRelationshipIndex: boolean;
  };
  status: 'clean' | 'drifted';
  timestamp: Date;
}

export class GraphConsistencyService {
  private logger = logger.child({ name: 'GraphConsistencyService' });

  constructor(
    private pg: Pool,
    private neo4j: Driver,
  ) {}

  /**
   * Run consistency check for a specific investigation
   */
  async checkInvestigation(
    investigationId: string,
    tenantId: string,
  ): Promise<ConsistencyReport> {
    const session = this.neo4j.session();

    try {
      // 1. Get stats from Postgres
      // We need IDs to identify missing ones
      const { rows: pgEntities } = await this.pg.query(
        `SELECT id FROM entities
         WHERE tenant_id = $1 AND props->>'investigationId' = $2`,
        [tenantId, investigationId],
      );
      const pgEntityIds = new Set(pgEntities.map((r) => r.id));

      const { rows: pgRelationships } = await this.pg.query(
        `SELECT id FROM relationships
         WHERE tenant_id = $1 AND props->>'investigationId' = $2`,
        [tenantId, investigationId],
      );
      const pgRelIds = new Set(pgRelationships.map((r) => r.id));

      // 2. Get stats from Neo4j
      // Assuming investigationId is indexed on nodes
      const neo4jEntitiesResult = await session.run(
        `MATCH (n:Entity)
         WHERE n.investigationId = $investigationId
         RETURN n.id as id`,
        { investigationId },
      );
      const neo4jEntityIds = new Set(
        neo4jEntitiesResult.records.map((r) => r.get('id')),
      );

      const neo4jRelsResult = await session.run(
        `MATCH ()-[r:RELATIONSHIP]->()
         WHERE r.investigationId = $investigationId
         RETURN r.id as id`,
        { investigationId },
      );
      const neo4jRelIds = new Set(
        neo4jRelsResult.records.map((r) => r.get('id')),
      );

      // 3. Check Indexes (Mocking check for now, assumes if query works, index works)
      // We can check db.indexes() specifically if needed, but for "Drift" we care about data.
      // A more rigorous check would query db.indexes()
      const indexCheck = await session.run(`SHOW INDEXES YIELD name, labelsOrTypes, properties`);
      const indexes = indexCheck.records.map(r => ({
          labels: r.get('labelsOrTypes'),
          props: r.get('properties')
      }));
      const hasNodeIndex = indexes.some(i => i.labels && i.labels.includes('Entity') && i.props && i.props.includes('investigationId'));
      const hasRelIndex = indexes.some(i => i.labels && i.labels.includes('RELATIONSHIP') && i.props && i.props.includes('investigationId'));

      // 4. Calculate Drift
      const postgresEntitiesMissingInNeo4j = [...pgEntityIds].filter(
        (id) => !neo4jEntityIds.has(id),
      );
      const neo4jEntitiesMissingInPostgres = [...neo4jEntityIds].filter(
        (id) => !pgEntityIds.has(id),
      );

      const postgresRelationshipsMissingInNeo4j = [...pgRelIds].filter(
        (id) => !neo4jRelIds.has(id),
      );
      const neo4jRelationshipsMissingInPostgres = [...neo4jRelIds].filter(
        (id) => !pgRelIds.has(id),
      );

      const isClean =
        postgresEntitiesMissingInNeo4j.length === 0 &&
        neo4jEntitiesMissingInPostgres.length === 0 &&
        postgresRelationshipsMissingInNeo4j.length === 0 &&
        neo4jRelationshipsMissingInPostgres.length === 0;

      return {
        investigationId,
        tenantId,
        postgresEntityCount: pgEntityIds.size,
        neo4jEntityCount: neo4jEntityIds.size,
        postgresRelationshipCount: pgRelIds.size,
        neo4jRelationshipCount: neo4jRelIds.size,
        postgresEntitiesMissingInNeo4j,
        neo4jEntitiesMissingInPostgres,
        postgresRelationshipsMissingInNeo4j,
        neo4jRelationshipsMissingInPostgres,
        indexesStatus: {
          neo4jNodeIndex: hasNodeIndex,
          neo4jRelationshipIndex: hasRelIndex,
        },
        status: isClean ? 'clean' : 'drifted',
        timestamp: new Date(),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Repair drift for a specific investigation
   */
  async repairInvestigation(
    investigationId: string,
    tenantId: string,
    report?: ConsistencyReport,
  ): Promise<ConsistencyReport> {
    if (!report) {
      report = await this.checkInvestigation(investigationId, tenantId);
    }

    if (report.status === 'clean') {
      return report;
    }

    this.logger.info({ investigationId, tenantId }, 'Starting repair routine');
    const session = this.neo4j.session();

    try {
      // Repair Entities: Missing in Neo4j -> Push from Postgres
      if (report.postgresEntitiesMissingInNeo4j.length > 0) {
        const { rows: entitiesToSync } = await this.pg.query(
          `SELECT * FROM entities WHERE id = ANY($1)`,
          [report.postgresEntitiesMissingInNeo4j],
        );

        for (const entity of entitiesToSync) {
            // Re-use logic similar to EntityRepo but ensuring investigationId is set
            await session.executeWrite(async tx => {
                await tx.run(`
                    MERGE (e:Entity {id: $id})
                    SET e.tenantId = $tenantId,
                        e.kind = $kind,
                        e.labels = $labels,
                        e.props = $props,
                        e.investigationId = $investigationId,
                        e.updatedAt = timestamp()
                `, {
                    id: entity.id,
                    tenantId: entity.tenant_id,
                    kind: entity.kind,
                    labels: entity.labels,
                    props: entity.props,
                    investigationId: entity.props.investigationId
                });
            });
        }
        this.logger.info(`Repaired ${entitiesToSync.length} entities missing in Neo4j`);
      }

      // Repair Relationships: Missing in Neo4j -> Push from Postgres
      if (report.postgresRelationshipsMissingInNeo4j.length > 0) {
           const { rows: relsToSync } = await this.pg.query(
          `SELECT * FROM relationships WHERE id = ANY($1)`,
          [report.postgresRelationshipsMissingInNeo4j],
        );

        for (const rel of relsToSync) {
             await session.executeWrite(async tx => {
                // Determine source and target from props or additional columns
                // Assuming relationships table has source_id and target_id
                const sourceId = rel.source_id;
                const targetId = rel.target_id;
                if (!sourceId || !targetId) {
                    this.logger.warn({ relId: rel.id }, 'Skipping relationship repair due to missing source/target');
                    return;
                }

                await tx.run(`
                    MATCH (s:Entity {id: $sourceId})
                    MATCH (t:Entity {id: $targetId})
                    MERGE (s)-[r:RELATIONSHIP {id: $id}]->(t)
                    SET r.type = $type,
                        r.props = $props,
                        r.tenantId = $tenantId,
                        r.investigationId = $investigationId,
                        r.updatedAt = timestamp()
                `, {
                    id: rel.id,
                    sourceId,
                    targetId,
                    type: rel.type,
                    props: rel.props,
                    tenantId: rel.tenant_id,
                    investigationId: rel.props.investigationId
                });
            });
        }
        this.logger.info(`Repaired ${relsToSync.length} relationships missing in Neo4j`);
      }

      // Clean Orphans: Missing in Postgres -> Delete from Neo4j
      if (report.neo4jEntitiesMissingInPostgres.length > 0) {
         await session.executeWrite(async tx => {
             await tx.run(`
                MATCH (e:Entity)
                WHERE e.id IN $ids
                DETACH DELETE e
             `, { ids: report.neo4jEntitiesMissingInPostgres });
         });
         this.logger.info(`Removed ${report.neo4jEntitiesMissingInPostgres.length} orphaned entities from Neo4j`);
      }

      if (report.neo4jRelationshipsMissingInPostgres.length > 0) {
           await session.executeWrite(async tx => {
             await tx.run(`
                MATCH ()-[r:RELATIONSHIP]->()
                WHERE r.id IN $ids
                DELETE r
             `, { ids: report.neo4jRelationshipsMissingInPostgres });
         });
         this.logger.info(`Removed ${report.neo4jRelationshipsMissingInPostgres.length} orphaned relationships from Neo4j`);
      }

      // Re-run check
      return this.checkInvestigation(investigationId, tenantId);

    } finally {
      await session.close();
    }
  }

  /**
   * Run global consistency check for all active investigations
   */
  async runGlobalCheck(): Promise<ConsistencyReport[]> {
      const { rows: investigations } = await this.pg.query(
          `SELECT id, tenant_id FROM investigations WHERE status = 'active'`
      );

      const reports: ConsistencyReport[] = [];
      for (const inv of investigations) {
          const report = await this.checkInvestigation(inv.id, inv.tenant_id);
          if (report.status === 'drifted') {
              reports.push(report);
          }
      }
      return reports;
  }
}
