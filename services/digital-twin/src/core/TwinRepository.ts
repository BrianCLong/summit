import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import neo4j, { Driver } from 'neo4j-driver';
import pino from 'pino';
import type { DigitalTwin, TwinState } from '../types/index.js';

const logger = pino({ name: 'TwinRepository' });

export class TwinRepository {
  private pg: Pool;
  private redis: RedisClientType;
  private neo4j: Driver;
  private cachePrefix = 'twin:';
  private cacheTtl = 300; // 5 minutes

  constructor(pgPool: Pool, redisClient: RedisClientType, neo4jDriver: Driver) {
    this.pg = pgPool;
    this.redis = redisClient;
    this.neo4j = neo4jDriver;
  }

  async save(twin: DigitalTwin): Promise<void> {
    const query = `
      INSERT INTO digital_twins (id, name, type, state, metadata, current_state_vector, data_bindings, relationships, provenance_chain, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        name = $2,
        type = $3,
        state = $4,
        metadata = $5,
        current_state_vector = $6,
        data_bindings = $7,
        relationships = $8,
        provenance_chain = $9,
        updated_at = $11
    `;

    await this.pg.query(query, [
      twin.metadata.id,
      twin.metadata.name,
      twin.metadata.type,
      twin.state,
      JSON.stringify(twin.metadata),
      JSON.stringify(twin.currentStateVector),
      JSON.stringify(twin.dataBindings),
      JSON.stringify(twin.relationships),
      JSON.stringify(twin.provenanceChain),
      twin.metadata.createdAt,
      twin.metadata.updatedAt,
    ]);

    // Update cache
    await this.redis.setEx(
      `${this.cachePrefix}${twin.metadata.id}`,
      this.cacheTtl,
      JSON.stringify(twin),
    );
  }

  async findById(id: string): Promise<DigitalTwin | null> {
    // Check cache first
    const cached = await this.redis.get(`${this.cachePrefix}${id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.pg.query(
      'SELECT * FROM digital_twins WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const twin = this.rowToTwin(row);

    // Update cache
    await this.redis.setEx(
      `${this.cachePrefix}${id}`,
      this.cacheTtl,
      JSON.stringify(twin),
    );

    return twin;
  }

  async findAll(filters?: {
    type?: string;
    state?: TwinState;
    tags?: string[];
  }): Promise<DigitalTwin[]> {
    let query = 'SELECT * FROM digital_twins WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }

    if (filters?.state) {
      query += ` AND state = $${paramIndex++}`;
      params.push(filters.state);
    }

    if (filters?.tags?.length) {
      query += ` AND metadata->'tags' ?| $${paramIndex++}`;
      params.push(filters.tags);
    }

    query += ' ORDER BY updated_at DESC LIMIT 1000';

    const result = await this.pg.query(query, params);
    return result.rows.map((row) => this.rowToTwin(row));
  }

  async delete(id: string): Promise<void> {
    await this.pg.query('DELETE FROM digital_twins WHERE id = $1', [id]);
    await this.redis.del(`${this.cachePrefix}${id}`);
  }

  async createNeo4jNode(twin: DigitalTwin): Promise<string> {
    const session = this.neo4j.session();
    try {
      const result = await session.run(
        `
        CREATE (t:DigitalTwin {
          id: $id,
          name: $name,
          type: $type,
          state: $state,
          createdAt: datetime($createdAt)
        })
        RETURN elementId(t) as nodeId
        `,
        {
          id: twin.metadata.id,
          name: twin.metadata.name,
          type: twin.metadata.type,
          state: twin.state,
          createdAt: twin.metadata.createdAt.toISOString(),
        },
      );
      return result.records[0].get('nodeId');
    } finally {
      await session.close();
    }
  }

  async updateNeo4jNode(twin: DigitalTwin): Promise<void> {
    const session = this.neo4j.session();
    try {
      await session.run(
        `
        MATCH (t:DigitalTwin {id: $id})
        SET t.state = $state,
            t.updatedAt = datetime($updatedAt),
            t.stateProperties = $stateProperties
        `,
        {
          id: twin.metadata.id,
          state: twin.state,
          updatedAt: twin.metadata.updatedAt.toISOString(),
          stateProperties: JSON.stringify(twin.currentStateVector.properties),
        },
      );
    } finally {
      await session.close();
    }
  }

  async deleteNeo4jNode(twinId: string): Promise<void> {
    const session = this.neo4j.session();
    try {
      await session.run(
        'MATCH (t:DigitalTwin {id: $id}) DETACH DELETE t',
        { id: twinId },
      );
    } finally {
      await session.close();
    }
  }

  async createNeo4jRelationship(
    sourceId: string,
    targetId: string,
    type: string,
    properties?: Record<string, unknown>,
  ): Promise<void> {
    const session = this.neo4j.session();
    try {
      await session.run(
        `
        MATCH (source:DigitalTwin {id: $sourceId})
        MATCH (target:DigitalTwin {id: $targetId})
        CREATE (source)-[r:TWIN_LINK {type: $type, properties: $properties}]->(target)
        `,
        {
          sourceId,
          targetId,
          type,
          properties: JSON.stringify(properties ?? {}),
        },
      );
    } finally {
      await session.close();
    }
  }

  private rowToTwin(row: Record<string, unknown>): DigitalTwin {
    return {
      metadata: row.metadata as DigitalTwin['metadata'],
      state: row.state as TwinState,
      currentStateVector: row.current_state_vector as DigitalTwin['currentStateVector'],
      stateHistory: [],
      dataBindings: row.data_bindings as DigitalTwin['dataBindings'],
      relationships: row.relationships as DigitalTwin['relationships'],
      provenanceChain: row.provenance_chain as string[],
    };
  }
}
