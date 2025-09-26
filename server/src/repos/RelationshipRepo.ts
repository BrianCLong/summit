/**
 * Relationship Repository - Production persistence layer
 * Handles relationships between entities with PostgreSQL + Neo4j dual-write
 */

import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
import { randomUUID as uuidv4 } from 'crypto';
import logger from '../config/logger.js';
import { withTenantConnection } from '../db/tenants/postgresTenancy.js';
import { ensureTenantNamespace } from '../db/tenants/neo4jTenancy.js';

const repoLogger = logger.child({ name: 'RelationshipRepo' });

export interface Relationship {
  id: string;
  tenantId: string;
  srcId: string;
  dstId: string;
  type: string;
  props: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface RelationshipInput {
  tenantId: string;
  srcId: string;
  dstId: string;
  type: string;
  props?: Record<string, any>;
}

interface RelationshipRow {
  id: string;
  tenant_id: string;
  src_id: string;
  dst_id: string;
  type: string;
  props: any;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export class RelationshipRepo {
  constructor(
    private pg: Pool,
    private neo4j: Driver,
  ) {}

  /**
   * Create new relationship with dual-write
   */
  async create(input: RelationshipInput, userId: string): Promise<Relationship> {
    const id = uuidv4();

    const relationship = await withTenantConnection(
      input.tenantId,
      async (client) => {
        const { rows: srcCheck } = await client.query(
          `SELECT id FROM entities WHERE id = $1 AND tenant_id = $2`,
          [input.srcId, input.tenantId],
        );

        const { rows: dstCheck } = await client.query(
          `SELECT id FROM entities WHERE id = $1 AND tenant_id = $2`,
          [input.dstId, input.tenantId],
        );

        if (srcCheck.length === 0) {
          throw new Error(`Source entity ${input.srcId} not found`);
        }

        if (dstCheck.length === 0) {
          throw new Error(`Destination entity ${input.dstId} not found`);
        }

        const { rows } = await client.query<RelationshipRow>(
          `INSERT INTO relationships (id, tenant_id, src_id, dst_id, type, props, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            id,
            input.tenantId,
            input.srcId,
            input.dstId,
            input.type,
            JSON.stringify(input.props || {}),
            userId,
          ],
        );

        await client.query(
          `INSERT INTO outbox_events (id, topic, payload)
           VALUES ($1, $2, $3)`,
          [
            uuidv4(),
            'relationship.upsert',
            JSON.stringify({ id: rows[0].id, tenantId: rows[0].tenant_id }),
          ],
        );

        return rows[0];
      },
      { pool: this.pg }
    );

    try {
      await this.upsertNeo4jRelationship({
        id: relationship.id,
        tenantId: relationship.tenant_id,
        srcId: relationship.src_id,
        dstId: relationship.dst_id,
        type: relationship.type,
        props: relationship.props,
      });
    } catch (neo4jError) {
      repoLogger.warn(
        { relationshipId: id, error: neo4jError },
        'Neo4j relationship write failed, will retry via outbox',
      );
    }

    return this.mapRow(relationship);
  }

  /**
   * Delete relationship with dual-write
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const deleted = await withTenantConnection(
      tenantId,
      async (client) => {
        const { rowCount } = await client.query(`DELETE FROM relationships WHERE id = $1`, [id]);

        if (rowCount && rowCount > 0) {
          await client.query(
            `INSERT INTO outbox_events (id, topic, payload)
             VALUES ($1, $2, $3)`,
            [uuidv4(), 'relationship.delete', JSON.stringify({ id, tenantId })],
          );
          return true;
        }

        return false;
      },
      { pool: this.pg }
    );

    if (!deleted) {
      return false;
    }

    try {
      await this.deleteNeo4jRelationship(id, tenantId);
    } catch (neo4jError) {
      repoLogger.warn(
        { relationshipId: id, error: neo4jError },
        'Neo4j relationship delete failed, will retry via outbox',
      );
    }

    return true;
  }

  /**
   * Find relationship by ID
   */
  async findById(id: string, tenantId: string): Promise<Relationship | null> {
    const row = await withTenantConnection(
      tenantId,
      async (client) => {
        const { rows } = await client.query<RelationshipRow>(
          `SELECT * FROM relationships WHERE id = $1`,
          [id],
        );
        return rows[0] ?? null;
      },
      { pool: this.pg }
    );

    return row ? this.mapRow(row) : null;
  }

  /**
   * Find relationships for an entity
   */
  async findByEntityId(
    entityId: string,
    tenantId: string,
    direction: 'incoming' | 'outgoing' | 'both' = 'both',
  ): Promise<Relationship[]> {
    const rows = await withTenantConnection(
      tenantId,
      async (client) => {
        let query = `SELECT * FROM relationships WHERE `;
        const params = [entityId];

        if (direction === 'incoming') {
          query += `dst_id = $1`;
        } else if (direction === 'outgoing') {
          query += `src_id = $1`;
        } else {
          query += `(src_id = $1 OR dst_id = $1)`;
        }

        query += ` ORDER BY created_at DESC`;

        const { rows } = await client.query<RelationshipRow>(query, params);
        return rows;
      },
      { pool: this.pg }
    );

    return rows.map(this.mapRow);
  }

  /**
   * Search relationships with filters
   */
  async search({
    tenantId,
    type,
    srcId,
    dstId,
    limit = 100,
    offset = 0,
  }: {
    tenantId: string;
    type?: string;
    srcId?: string;
    dstId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Relationship[]> {
    const rows = await withTenantConnection(
      tenantId,
      async (client) => {
        const params: any[] = [];
        let query = `SELECT * FROM relationships`;
        const conditions: string[] = ['TRUE'];

        if (type) {
          params.push(type);
          conditions.push(`type = $${params.length}`);
        }

        if (srcId) {
          params.push(srcId);
          conditions.push(`src_id = $${params.length}`);
        }

        if (dstId) {
          params.push(dstId);
          conditions.push(`dst_id = $${params.length}`);
        }

        query += ` WHERE ${conditions.join(' AND ')}`;
        params.push(Math.min(limit, 1000));
        params.push(offset);
        query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const { rows } = await client.query<RelationshipRow>(query, params);
        return rows;
      },
      { pool: this.pg }
    );

    return rows.map(this.mapRow);
  }

  /**
   * Get relationship count for an entity (for graph analysis)
   */
  async getEntityRelationshipCount(
    entityId: string,
    tenantId: string,
  ): Promise<{ incoming: number; outgoing: number }> {
    const counts = await withTenantConnection(
      tenantId,
      async (client) => {
        const { rows } = await client.query(
          `SELECT
             COUNT(*) FILTER (WHERE src_id = $1) as outgoing,
             COUNT(*) FILTER (WHERE dst_id = $1) as incoming
           FROM relationships
           WHERE src_id = $1 OR dst_id = $1`,
          [entityId],
        );
        return rows[0] || { incoming: 0, outgoing: 0 };
      },
      { pool: this.pg }
    );

    return {
      incoming: parseInt(counts?.incoming || '0'),
      outgoing: parseInt(counts?.outgoing || '0'),
    };
  }

  /**
   * Upsert relationship in Neo4j (idempotent)
   */
  private async upsertNeo4jRelationship({
    id,
    tenantId,
    srcId,
    dstId,
    type,
    props,
  }: {
    id: string;
    tenantId: string;
    srcId: string;
    dstId: string;
    type: string;
    props: any;
  }): Promise<void> {
    const database = await ensureTenantNamespace(this.neo4j, tenantId);
    const session = this.neo4j.session({ database });

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (src:Entity {id: $srcId}), (dst:Entity {id: $dstId})
           MERGE (src)-[r:REL {id: $id}]->(dst)
           ON CREATE SET r.createdAt = timestamp()
           SET r.tenantId = $tenantId,
               r.type = $type,
               r.props = $props,
               r.updatedAt = timestamp()`,
          { id, tenantId, srcId, dstId, type, props },
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Delete relationship from Neo4j
   */
  private async deleteNeo4jRelationship(id: string, tenantId: string): Promise<void> {
    const database = await ensureTenantNamespace(this.neo4j, tenantId);
    const session = this.neo4j.session({ database });

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH ()-[r:REL {id: $id}]-()
           DELETE r`,
          { id },
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Map database row to domain object
   */
  private mapRow(row: RelationshipRow): Relationship {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      srcId: row.src_id,
      dstId: row.dst_id,
      type: row.type,
      props: row.props,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
