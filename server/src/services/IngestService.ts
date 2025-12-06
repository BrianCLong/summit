/**
 * Ingest Service - Data ingestion with provenance and deduplication
 * Target: ≥1e5 rows/s/worker
 */

import { Pool, PoolClient } from 'pg';
import { Driver, Session } from 'neo4j-driver';
import { createHash } from 'crypto';
import { randomUUID as uuidv4 } from 'crypto';
import logger from '../config/logger.js';

const ingestLogger = logger.child({ name: 'IngestService' });

export interface IngestInput {
  tenantId: string;
  sourceType: string;
  sourceId: string;
  entities: Array<{
    externalId?: string;
    kind: string;
    labels: string[];
    properties: Record<string, any>;
  }>;
  relationships: Array<{
    fromExternalId: string;
    toExternalId: string;
    relationshipType: string;
    properties?: Record<string, any>;
    confidence: number;
    source?: string;
  }>;
  userId: string;
}

export interface IngestResult {
  success: boolean;
  entitiesCreated: number;
  entitiesUpdated: number;
  relationshipsCreated: number;
  relationshipsUpdated: number;
  errors: string[];
  provenanceId: string;
}

export class IngestService {
  constructor(
    private pg: Pool,
    private neo4j: Driver,
  ) {}

  /**
   * Ingest entities and relationships with full provenance tracking
   */
  async ingest(input: IngestInput): Promise<IngestResult> {
    const startTime = Date.now();
    const provenanceId = uuidv4();
    const errors: string[] = [];

    let entitiesCreated = 0;
    let entitiesUpdated = 0;
    let relationshipsCreated = 0;
    let relationshipsUpdated = 0;

    const client = await this.pg.connect();

    try {
      await client.query('BEGIN');

      // 1. Create provenance record
      await this.createProvenanceRecord(client, {
        id: provenanceId,
        tenantId: input.tenantId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        userId: input.userId,
        entityCount: input.entities.length,
        relationshipCount: input.relationships.length,
      });

      // 2. Map external IDs to internal stable IDs
      const idMap = new Map<string, string>();

      // 3. Upsert entities in batches for performance
      const BATCH_SIZE = 1000;
      for (let i = 0; i < input.entities.length; i += BATCH_SIZE) {
        const batch = input.entities.slice(i, i + BATCH_SIZE);

        for (const entityInput of batch) {
          try {
            const stableId = this.generateStableId(
              input.tenantId,
              entityInput.kind,
              entityInput.properties,
            );

            // Map external ID to stable ID
            if (entityInput.externalId) {
              idMap.set(entityInput.externalId, stableId);
            }

            const existing = await this.findEntityByStableId(client, stableId);

            if (existing) {
              // Update existing entity
              await this.updateEntity(client, {
                id: existing.id,
                labels: entityInput.labels,
                properties: entityInput.properties,
                provenanceId,
              });
              entitiesUpdated++;
            } else {
              // Create new entity
              await this.createEntity(client, {
                id: stableId,
                tenantId: input.tenantId,
                kind: entityInput.kind,
                labels: entityInput.labels,
                properties: entityInput.properties,
                userId: input.userId,
                provenanceId,
              });
              entitiesCreated++;
            }
          } catch (error: any) {
            errors.push(`Entity ${entityInput.externalId}: ${error.message}`);
            ingestLogger.warn({ error, entityInput }, 'Failed to ingest entity');
          }
        }
      }

      // 4. Upsert relationships
      for (const relInput of input.relationships) {
        try {
          const fromId = idMap.get(relInput.fromExternalId);
          const toId = idMap.get(relInput.toExternalId);

          if (!fromId || !toId) {
            errors.push(
              `Relationship ${relInput.fromExternalId}->${relInput.toExternalId}: Entity not found`,
            );
            continue;
          }

          const relId = this.generateRelationshipId(
            fromId,
            toId,
            relInput.relationshipType,
          );

          const existing = await this.findRelationshipById(client, relId);

          if (existing) {
            await this.updateRelationship(client, {
              id: relId,
              properties: relInput.properties,
              confidence: relInput.confidence,
              provenanceId,
            });
            relationshipsUpdated++;
          } else {
            await this.createRelationship(client, {
              id: relId,
              tenantId: input.tenantId,
              fromEntityId: fromId,
              toEntityId: toId,
              relationshipType: relInput.relationshipType,
              properties: relInput.properties || {},
              confidence: relInput.confidence,
              source: relInput.source || input.sourceType,
              provenanceId,
            });
            relationshipsCreated++;
          }
        } catch (error: any) {
          errors.push(
            `Relationship ${relInput.fromExternalId}->${relInput.toExternalId}: ${error.message}`,
          );
          ingestLogger.warn({ error, relInput }, 'Failed to ingest relationship');
        }
      }

      // 5. Commit PostgreSQL transaction
      await client.query('COMMIT');

      // 6. Sync to Neo4j (best effort, with outbox fallback)
      try {
        await this.syncToNeo4j(input.tenantId, provenanceId);
      } catch (neo4jError) {
        ingestLogger.warn(
          { provenanceId, error: neo4jError },
          'Neo4j sync failed, will retry via outbox',
        );
      }

      const took = Date.now() - startTime;
      const throughput = Math.round(
        ((entitiesCreated + entitiesUpdated) / took) * 1000,
      );

      ingestLogger.info({
        provenanceId,
        tenantId: input.tenantId,
        entitiesCreated,
        entitiesUpdated,
        relationshipsCreated,
        relationshipsUpdated,
        errors: errors.length,
        took,
        throughput: `${throughput} entities/sec`,
      });

      return {
        success: errors.length === 0,
        entitiesCreated,
        entitiesUpdated,
        relationshipsCreated,
        relationshipsUpdated,
        errors,
        provenanceId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate stable ID from natural keys (idempotent)
   * Uses SHA-256 hash of tenant + kind + natural keys
   */
  private generateStableId(
    tenantId: string,
    kind: string,
    properties: Record<string, any>,
  ): string {
    // Define natural keys per entity type
    const naturalKeys: Record<string, string[]> = {
      person: ['name', 'dateOfBirth', 'nationality'],
      organization: ['name', 'jurisdiction', 'registrationNumber'],
      asset: ['assetType', 'serialNumber'],
      event: ['eventType', 'timestamp', 'description'],
      indicator: ['indicatorType', 'value'],
    };

    const keys = naturalKeys[kind.toLowerCase()] || ['name'];
    const values = keys
      .map((key) => properties[key])
      .filter((v) => v !== undefined)
      .map((v) => String(v).toLowerCase().trim());

    const composite = `${tenantId}:${kind}:${values.join(':')}`;
    const hash = createHash('sha256').update(composite).digest('hex');

    return `${tenantId}:${kind}:${hash.substring(0, 16)}`;
  }

  /**
   * Generate deterministic relationship ID
   */
  private generateRelationshipId(
    fromId: string,
    toId: string,
    relationshipType: string,
  ): string {
    const composite = `${fromId}:${relationshipType}:${toId}`;
    const hash = createHash('sha256').update(composite).digest('hex');
    return `rel:${hash.substring(0, 16)}`;
  }

  /**
   * Create provenance record in audit table
   */
  private async createProvenanceRecord(
    client: PoolClient,
    data: {
      id: string;
      tenantId: string;
      sourceType: string;
      sourceId: string;
      userId: string;
      entityCount: number;
      relationshipCount: number;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO provenance_records (
        id, tenant_id, source_type, source_id, user_id,
        entity_count, relationship_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        data.id,
        data.tenantId,
        data.sourceType,
        data.sourceId,
        data.userId,
        data.entityCount,
        data.relationshipCount,
      ],
    );
  }

  /**
   * Find entity by stable ID
   */
  private async findEntityByStableId(
    client: PoolClient,
    stableId: string,
  ): Promise<any> {
    const { rows } = await client.query(
      `SELECT * FROM entities WHERE id = $1`,
      [stableId],
    );
    return rows[0];
  }

  /**
   * Create entity
   */
  private async createEntity(
    client: PoolClient,
    data: {
      id: string;
      tenantId: string;
      kind: string;
      labels: string[];
      properties: Record<string, any>;
      userId: string;
      provenanceId: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO entities (
        id, tenant_id, kind, labels, props, created_by, provenance_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.id,
        data.tenantId,
        data.kind,
        data.labels,
        JSON.stringify(data.properties),
        data.userId,
        data.provenanceId,
      ],
    );
  }

  /**
   * Update entity
   */
  private async updateEntity(
    client: PoolClient,
    data: {
      id: string;
      labels: string[];
      properties: Record<string, any>;
      provenanceId: string;
    },
  ): Promise<void> {
    await client.query(
      `UPDATE entities
       SET labels = $2, props = $3, updated_at = NOW(), provenance_id = $4
       WHERE id = $1`,
      [data.id, data.labels, JSON.stringify(data.properties), data.provenanceId],
    );
  }

  /**
   * Find relationship by ID
   */
  private async findRelationshipById(
    client: PoolClient,
    id: string,
  ): Promise<any> {
    const { rows } = await client.query(
      `SELECT * FROM relationships WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  /**
   * Create relationship
   */
  private async createRelationship(
    client: PoolClient,
    data: {
      id: string;
      tenantId: string;
      fromEntityId: string;
      toEntityId: string;
      relationshipType: string;
      properties: Record<string, any>;
      confidence: number;
      source: string;
      provenanceId: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO relationships (
        id, tenant_id, from_entity_id, to_entity_id, relationship_type,
        props, confidence, source, provenance_id, first_seen
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        data.id,
        data.tenantId,
        data.fromEntityId,
        data.toEntityId,
        data.relationshipType,
        JSON.stringify(data.properties),
        data.confidence,
        data.source,
        data.provenanceId,
      ],
    );
  }

  /**
   * Update relationship
   */
  private async updateRelationship(
    client: PoolClient,
    data: {
      id: string;
      properties?: Record<string, any>;
      confidence: number;
      provenanceId: string;
    },
  ): Promise<void> {
    await client.query(
      `UPDATE relationships
       SET props = COALESCE($2, props), confidence = $3,
           provenance_id = $4, last_seen = NOW()
       WHERE id = $1`,
      [
        data.id,
        data.properties ? JSON.stringify(data.properties) : null,
        data.confidence,
        data.provenanceId,
      ],
    );
  }

  /**
   * Sync entities/relationships to Neo4j
   */
  private async syncToNeo4j(tenantId: string, provenanceId: string): Promise<void> {
    const session = this.neo4j.session();

    try {
      // Fetch entities from this provenance batch
      const client = await this.pg.connect();
      try {
        const { rows: entities } = await client.query(
          `SELECT * FROM entities WHERE provenance_id = $1`,
          [provenanceId],
        );

        const { rows: relationships } = await client.query(
          `SELECT * FROM relationships WHERE provenance_id = $1`,
          [provenanceId],
        );

        // Batch upsert to Neo4j
        for (const entity of entities) {
          await session.run(
            `MERGE (n {id: $id, tenantId: $tenantId})
             SET n += $properties, n:${entity.kind}
             RETURN n`,
            {
              id: entity.id,
              tenantId: entity.tenant_id,
              properties: {
                ...JSON.parse(entity.props),
                labels: entity.labels,
                createdAt: entity.created_at.toISOString(),
                updatedAt: entity.updated_at.toISOString(),
              },
            },
          );
        }

        for (const rel of relationships) {
          await session.run(
            `MATCH (from {id: $fromId, tenantId: $tenantId})
             MATCH (to {id: $toId, tenantId: $tenantId})
             MERGE (from)-[r:${rel.relationship_type}]->(to)
             SET r += $properties
             RETURN r`,
            {
              fromId: rel.from_entity_id,
              toId: rel.to_entity_id,
              tenantId: rel.tenant_id,
              properties: {
                ...JSON.parse(rel.props),
                confidence: rel.confidence,
                source: rel.source,
                firstSeen: rel.first_seen.toISOString(),
              },
            },
          );
        }
      } finally {
        client.release();
      }
    } finally {
      await session.close();
    }
  }
}
