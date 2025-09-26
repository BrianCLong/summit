/**
 * Entity Repository - Production persistence layer
 * Replaces demo resolvers with PostgreSQL (canonical) + Neo4j (graph) dual-write
 */

import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
import { randomUUID as uuidv4 } from 'crypto';
import logger from '../config/logger.js';
import { withTenantConnection } from '../db/tenants/postgresTenancy.js';
import { ensureTenantNamespace } from '../db/tenants/neo4jTenancy.js';

const repoLogger = logger.child({ name: 'EntityRepo' });

export interface Entity {
  id: string;
  tenantId: string;
  kind: string;
  labels: string[];
  props: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EntityInput {
  tenantId: string;
  kind: string;
  labels?: string[];
  props?: Record<string, any>;
}

export interface EntityUpdateInput {
  id: string;
  tenantId: string;
  labels?: string[];
  props?: Record<string, any>;
}

interface EntityRow {
  id: string;
  tenant_id: string;
  kind: string;
  labels: string[];
  props: any;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export class EntityRepo {
  constructor(
    private pg: Pool,
    private neo4j: Driver,
  ) {}

  /**
   * Create new entity with dual-write to PG (canonical) + Neo4j (graph)
   */
  async create(input: EntityInput, userId: string): Promise<Entity> {
    const id = uuidv4();

    const entity = await withTenantConnection(
      input.tenantId,
      async (client) => {
        const { rows } = await client.query<EntityRow>(
          `INSERT INTO entities (id, tenant_id, kind, labels, props, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            id,
            input.tenantId,
            input.kind,
            input.labels || [],
            JSON.stringify(input.props || {}),
            userId,
          ],
        );

        await client.query(
          `INSERT INTO outbox_events (id, topic, payload)
           VALUES ($1, $2, $3)`,
          [uuidv4(), 'entity.upsert', JSON.stringify({ id: rows[0].id, tenantId: rows[0].tenant_id })],
        );

        return rows[0];
      },
      { pool: this.pg }
    );

    try {
      await this.upsertNeo4jNode({
        id: entity.id,
        tenantId: entity.tenant_id,
        kind: entity.kind,
        labels: entity.labels,
        props: entity.props,
      });
    } catch (neo4jError) {
      repoLogger.warn(
        { entityId: id, error: neo4jError },
        'Neo4j write failed, will retry via outbox',
      );
    }

    return this.mapRow(entity);
  }

  /**
   * Update entity with dual-write
   */
  async update(input: EntityUpdateInput): Promise<Entity | null> {
    const entity = await withTenantConnection(
      input.tenantId,
      async (client) => {
        const updateFields: string[] = [];
        const params: any[] = [input.id];
        let paramIndex = 2;

        if (input.labels !== undefined) {
          updateFields.push(`labels = $${paramIndex}`);
          params.push(input.labels);
          paramIndex++;
        }

        if (input.props !== undefined) {
          updateFields.push(`props = $${paramIndex}`);
          params.push(JSON.stringify(input.props));
          paramIndex++;
        }

        updateFields.push(`updated_at = now()`);

        const { rows } = await client.query<EntityRow>(
          `UPDATE entities SET ${updateFields.join(', ')}
           WHERE id = $1
           RETURNING *`,
          params,
        );

        if (rows.length === 0) {
          return null;
        }

        await client.query(
          `INSERT INTO outbox_events (id, topic, payload)
           VALUES ($1, $2, $3)`,
          [uuidv4(), 'entity.upsert', JSON.stringify({ id: rows[0].id, tenantId: rows[0].tenant_id })],
        );

        return rows[0];
      },
      { pool: this.pg }
    );

    if (!entity) {
      return null;
    }

    try {
      await this.upsertNeo4jNode({
        id: entity.id,
        tenantId: entity.tenant_id,
        kind: entity.kind,
        labels: entity.labels,
        props: entity.props,
      });
    } catch (neo4jError) {
      repoLogger.warn(
        { entityId: input.id, error: neo4jError },
        'Neo4j update failed, will retry via outbox',
      );
    }

    return this.mapRow(entity);
  }

  /**
   * Delete entity with dual-write
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const deleted = await withTenantConnection(
      tenantId,
      async (client) => {
        const { rowCount } = await client.query(`DELETE FROM entities WHERE id = $1`, [id]);

        if (rowCount && rowCount > 0) {
          await client.query(
            `INSERT INTO outbox_events (id, topic, payload)
             VALUES ($1, $2, $3)`,
            [uuidv4(), 'entity.delete', JSON.stringify({ id, tenantId })],
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
      await this.deleteNeo4jNode(id, tenantId);
    } catch (neo4jError) {
      repoLogger.warn(
        { entityId: id, error: neo4jError },
        'Neo4j delete failed, will retry via outbox',
      );
    }

    return true;
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, tenantId: string): Promise<Entity | null> {
    const row = await withTenantConnection(
      tenantId,
      async (client) => {
        const { rows } = await client.query<EntityRow>(
          `SELECT * FROM entities WHERE id = $1`,
          [id],
        );
        return rows[0] ?? null;
      },
      { pool: this.pg }
    );

    return row ? this.mapRow(row) : null;
  }

  /**
   * Search entities with filters
   */
  async search({
    tenantId,
    kind,
    props,
    limit = 100,
    offset = 0,
  }: {
    tenantId: string;
    kind?: string;
    props?: Record<string, any>;
    limit?: number;
    offset?: number;
  }): Promise<Entity[]> {
    const rows = await withTenantConnection(
      tenantId,
      async (client) => {
        const params: any[] = [];
        let query = `SELECT * FROM entities`;
        const conditions: string[] = ['TRUE'];

        if (kind) {
          params.push(kind);
          conditions.push(`kind = $${params.length}`);
        }

        if (props) {
          params.push(JSON.stringify(props));
          conditions.push(`props @> $${params.length}::jsonb`);
        }

        query += ` WHERE ${conditions.join(' AND ')}`;
        params.push(Math.min(limit, 1000));
        params.push(offset);
        query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const { rows } = await client.query<EntityRow>(query, params);
        return rows;
      },
      { pool: this.pg }
    );

    return rows.map(this.mapRow);
  }

  /**
   * Batch load entities by IDs (for DataLoader)
   */
  async batchByIds(ids: readonly string[], tenantId: string): Promise<(Entity | null)[]> {
    if (ids.length === 0) return [];

    const rows = await withTenantConnection(
      tenantId,
      async (client) => {
        const { rows } = await client.query<EntityRow>(
          `SELECT * FROM entities WHERE id = ANY($1)`,
          [ids],
        );
        return rows;
      },
      { pool: this.pg }
    );

    const entitiesMap = new Map(rows.map((row) => [row.id, this.mapRow(row)]));

    return ids.map((id) => entitiesMap.get(id) || null);
  }

  /**
   * Upsert entity node in Neo4j (idempotent)
   */
  private async upsertNeo4jNode({
    id,
    tenantId,
    kind,
    labels,
    props,
  }: {
    id: string;
    tenantId: string;
    kind: string;
    labels: string[];
    props: any;
  }): Promise<void> {
    const database = await ensureTenantNamespace(this.neo4j, tenantId);
    const session = this.neo4j.session({ database });

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MERGE (e:Entity {id: $id})
           ON CREATE SET e.createdAt = timestamp()
           SET e.tenantId = $tenantId,
               e.kind = $kind,
               e.labels = $labels,
               e.props = $props,
               e.updatedAt = timestamp()`,
          { id, tenantId, kind, labels, props },
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Delete entity node from Neo4j
   */
  private async deleteNeo4jNode(id: string, tenantId: string): Promise<void> {
    const database = await ensureTenantNamespace(this.neo4j, tenantId);
    const session = this.neo4j.session({ database });

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (e:Entity {id: $id})
           DETACH DELETE e`,
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
  private mapRow(row: EntityRow): Entity {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      kind: row.kind,
      labels: row.labels,
      props: row.props,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
