import { Entity, Edge, Document, Chunk, ConnectorContext } from '../data-model/types.js';
import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
import { getNeo4jDriver } from '../config/database.js';

type PoolLike = {
  connect: () => Promise<{
    query: (text: string, params?: any[]) => Promise<any>;
    release: () => void;
  }>;
};

interface IndexingServiceOptions {
  pool?: PoolLike;
  neo4jDriver?: Driver;
  batchWritesEnabled?: boolean;
}

export class IndexingService {
  private pgPool: PoolLike;
  private neo4jDriverFactory: () => Driver;
  private readonly useBatchWrites: boolean;

  constructor(options: IndexingServiceOptions = {}) {
    // Assuming process.env.DATABASE_URL is set
    this.pgPool = options.pool || new Pool({ connectionString: process.env.DATABASE_URL });
    this.neo4jDriverFactory = () => options.neo4jDriver || getNeo4jDriver();
    this.useBatchWrites =
      options.batchWritesEnabled !== undefined
        ? options.batchWritesEnabled
        : process.env.BATCH_WRITES_V1 === '1';
  }

  async index(
    data: { entities: Entity[]; edges: Edge[]; documents: Document[]; chunks: Chunk[] },
    ctx: ConnectorContext
  ): Promise<void> {
    const writeSet = this.useBatchWrites ? this.mergeDuplicates(data) : data;
    const client = await this.pgPool.connect();

    try {
      await client.query('BEGIN');

      if (this.useBatchWrites) {
        await this.deferConstraints(client, ctx);
        await this.batchUpsertEntities(client, writeSet.entities, ctx);
        await this.batchUpsertEdges(client, writeSet.edges, ctx);
        await this.batchUpsertDocuments(client, writeSet.documents, ctx);
        await this.batchUpsertChunks(client, writeSet.chunks, ctx);
      } else {
        await this.legacyEntityWrites(client, writeSet.entities, ctx);
        await this.legacyEdgeWrites(client, writeSet.edges, ctx);
        await this.legacyDocumentWrites(client, writeSet.documents, ctx);
        await this.legacyChunkWrites(client, writeSet.chunks, ctx);
      }

      await client.query('COMMIT');
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // 5. Write to Neo4j (Graph)
    await this.syncToNeo4j(writeSet, ctx);
  }

  private async syncToNeo4j(data: { entities: Entity[]; edges: Edge[] }, ctx: ConnectorContext) {
    const driver = this.neo4jDriverFactory();
    const session = driver.session();

    try {
      if (this.useBatchWrites) {
        if (data.entities.length > 0) {
          await session.executeWrite((tx: any) =>
            tx.run(
              `UNWIND $entities AS entity
               MERGE (e:Entity {id: entity.id, tenantId: entity.tenantId})
               SET e.kind = entity.kind,
                   e.labels = entity.labels,
                   e += entity.props`,
              {
                entities: data.entities.map((entity) => ({
                  ...entity,
                  props: entity.properties,
                  tenantId: ctx.tenantId,
                })),
              },
            ),
          );
        }

        if (data.edges.length > 0) {
          await session.executeWrite((tx: any) =>
            tx.run(
              `UNWIND $edges AS edge
               MATCH (from:Entity {id: edge.fromId, tenantId: edge.tenantId})
               MATCH (to:Entity {id: edge.toId, tenantId: edge.tenantId})
               MERGE (from)-[r:RELATIONSHIP {id: edge.id, kind: edge.kind}]->(to)
               SET r += edge.props`,
              {
                edges: data.edges.map((edge) => ({
                  id: edge.id,
                  fromId: edge.fromEntityId,
                  toId: edge.toEntityId,
                  kind: edge.kind,
                  props: edge.properties,
                  tenantId: ctx.tenantId,
                })),
              },
            ),
          );
        }
      } else {
        for (const entity of data.entities) {
          await session.run(
            `MERGE (e:Entity {id: $id, tenantId: $tenantId})
             SET e.kind = $kind, e.labels = $labels, e += $props`,
            { id: entity.id, tenantId: ctx.tenantId, kind: entity.kind, labels: entity.labels, props: entity.properties }
          );
        }

        for (const edge of data.edges) {
          await session.run(
            `MATCH (from:Entity {id: $fromId, tenantId: $tenantId})
             MATCH (to:Entity {id: $toId, tenantId: $tenantId})
             MERGE (from)-[r:RELATIONSHIP {id: $id, kind: $kind}]->(to)
             SET r += $props`,
            { fromId: edge.fromEntityId, toId: edge.toEntityId, tenantId: ctx.tenantId, id: edge.id, kind: edge.kind, props: edge.properties }
          );
        }
      }
    } catch (e: any) {
      // Log but don't fail the whole batch if graph sync fails (dual-write problem)
      // Ideally use an event bus for reliable eventual consistency
      console.error('Failed to sync to Neo4j', e);
    } finally {
      await session.close();
    }
  }

  private async deferConstraints(client: { query: (text: string) => Promise<any> }, ctx: ConnectorContext) {
    try {
      await client.query('SET CONSTRAINTS ALL DEFERRED');
      ctx.logger?.debug?.('Deferred constraints for batch ingest');
    } catch (error: any) {
      ctx.logger?.debug?.({ error }, 'Unable to defer constraints (continuing with immediate checks)');
    }
  }

  private async batchUpsertEntities(
    client: { query: (text: string, params: any[]) => Promise<any> },
    entities: Entity[],
    ctx: ConnectorContext,
  ) {
    if (entities.length === 0) return;

    const placeholders: string[] = [];
    const params: any[] = [];

    entities.forEach((entity, idx) => {
      const base = idx * 6;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`,
      );
      params.push(
        entity.id,
        ctx.tenantId,
        entity.kind,
        entity.labels || [],
        JSON.stringify(entity.properties || {}),
        entity.sourceIds || [],
      );
    });

    const query = `
      INSERT INTO entities (id, tenant_id, kind, labels, properties, source_ids)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id, tenant_id) DO UPDATE SET
        properties = COALESCE(entities.properties, '{}'::jsonb) || EXCLUDED.properties,
        labels = (
          SELECT ARRAY(
            SELECT DISTINCT unnest(COALESCE(entities.labels, '{}'::text[]) || COALESCE(EXCLUDED.labels, '{}'::text[]))
          )
        ),
        source_ids = (
          SELECT ARRAY(
            SELECT DISTINCT unnest(COALESCE(entities.source_ids, '{}'::text[]) || COALESCE(EXCLUDED.source_ids, '{}'::text[]))
          )
        ),
        updated_at = NOW();
    `;

    const start = Date.now();
    await client.query(query, params);
    ctx.logger?.debug?.({ count: entities.length, ms: Date.now() - start }, 'Batch upserted entities');
  }

  private async batchUpsertEdges(
    client: { query: (text: string, params: any[]) => Promise<any> },
    edges: Edge[],
    ctx: ConnectorContext,
  ) {
    if (edges.length === 0) return;

    const placeholders: string[] = [];
    const params: any[] = [];

    edges.forEach((edge, idx) => {
      const base = idx * 7;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`,
      );
      params.push(
        edge.id,
        ctx.tenantId,
        edge.fromEntityId,
        edge.toEntityId,
        edge.kind,
        JSON.stringify(edge.properties || {}),
        edge.sourceIds || [],
      );
    });

    const query = `
      INSERT INTO edges (id, tenant_id, from_entity_id, to_entity_id, kind, properties, source_ids)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id, tenant_id) DO UPDATE SET
        properties = COALESCE(edges.properties, '{}'::jsonb) || EXCLUDED.properties,
        source_ids = (
          SELECT ARRAY(
            SELECT DISTINCT unnest(COALESCE(edges.source_ids, '{}'::text[]) || COALESCE(EXCLUDED.source_ids, '{}'::text[]))
          )
        ),
        updated_at = NOW();
    `;

    const start = Date.now();
    await client.query(query, params);
    ctx.logger?.debug?.({ count: edges.length, ms: Date.now() - start }, 'Batch upserted edges');
  }

  private async batchUpsertDocuments(
    client: { query: (text: string, params: any[]) => Promise<any> },
    documents: Document[],
    ctx: ConnectorContext,
  ) {
    if (documents.length === 0) return;

    const placeholders: string[] = [];
    const params: any[] = [];

    documents.forEach((doc, idx) => {
      const base = idx * 8;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`,
      );
      params.push(
        doc.id,
        ctx.tenantId,
        doc.title || null,
        doc.mimeType || null,
        doc.source ? JSON.stringify(doc.source) : null,
        doc.text,
        JSON.stringify(doc.metadata || {}),
        doc.entityIds || [],
      );
    });

    const query = `
      INSERT INTO documents (id, tenant_id, title, mime_type, source, text, metadata, entity_ids)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id, tenant_id) DO UPDATE SET
        text = EXCLUDED.text,
        metadata = COALESCE(documents.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        entity_ids = (
          SELECT ARRAY(
            SELECT DISTINCT unnest(COALESCE(documents.entity_ids, '{}'::text[]) || COALESCE(EXCLUDED.entity_ids, '{}'::text[]))
          )
        ),
        title = COALESCE(EXCLUDED.title, documents.title),
        mime_type = COALESCE(EXCLUDED.mime_type, documents.mime_type),
        source = COALESCE(EXCLUDED.source, documents.source),
        updated_at = NOW();
    `;

    const start = Date.now();
    await client.query(query, params);
    ctx.logger?.debug?.({ count: documents.length, ms: Date.now() - start }, 'Batch upserted documents');
  }

  private async batchUpsertChunks(
    client: { query: (text: string, params: any[]) => Promise<any> },
    chunks: Chunk[],
    ctx: ConnectorContext,
  ) {
    if (chunks.length === 0) return;

    const placeholders: string[] = [];
    const params: any[] = [];

    chunks.forEach((chunk, idx) => {
      const base = idx * 7;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`,
      );
      const embeddingVector = chunk.embedding ? `[${chunk.embedding.join(',')}]` : null;
      params.push(
        chunk.id,
        ctx.tenantId,
        chunk.documentId,
        chunk.text,
        chunk.offset,
        JSON.stringify(chunk.metadata || {}),
        embeddingVector,
      );
    });

    const query = `
      INSERT INTO chunks (id, tenant_id, document_id, text, "offset", metadata, embedding)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id, tenant_id) DO UPDATE SET
        text = EXCLUDED.text,
        metadata = COALESCE(chunks.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        "offset" = COALESCE(EXCLUDED."offset", chunks."offset"),
        embedding = COALESCE(EXCLUDED.embedding, chunks.embedding);
    `;

    const start = Date.now();
    await client.query(query, params);
    ctx.logger?.debug?.({ count: chunks.length, ms: Date.now() - start }, 'Batch upserted chunks');
  }

  private async legacyEntityWrites(
    client: { query: (text: string, params: any[]) => Promise<any> },
    entities: Entity[],
    ctx: ConnectorContext,
  ) {
    for (const entity of entities) {
      await client.query(
        `INSERT INTO entities (id, tenant_id, kind, labels, properties, source_ids)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id, tenant_id) DO UPDATE SET
           properties = EXCLUDED.properties,
           updated_at = NOW()`,
        [
          entity.id,
          ctx.tenantId,
          entity.kind,
          entity.labels,
          JSON.stringify(entity.properties),
          entity.sourceIds,
        ],
      );
    }
  }

  private async legacyEdgeWrites(
    client: { query: (text: string, params: any[]) => Promise<any> },
    edges: Edge[],
    ctx: ConnectorContext,
  ) {
    for (const edge of edges) {
      await client.query(
        `INSERT INTO edges (id, tenant_id, from_entity_id, to_entity_id, kind, properties, source_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id, tenant_id) DO NOTHING`,
        [
          edge.id,
          ctx.tenantId,
          edge.fromEntityId,
          edge.toEntityId,
          edge.kind,
          JSON.stringify(edge.properties),
          edge.sourceIds,
        ],
      );
    }
  }

  private async legacyDocumentWrites(
    client: { query: (text: string, params: any[]) => Promise<any> },
    documents: Document[],
    ctx: ConnectorContext,
  ) {
    for (const doc of documents) {
      await client.query(
        `INSERT INTO documents (id, tenant_id, title, mime_type, source, text, metadata, entity_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id, tenant_id) DO UPDATE SET
           text = EXCLUDED.text,
           updated_at = NOW()`,
        [
          doc.id,
          ctx.tenantId,
          doc.title,
          doc.mimeType,
          JSON.stringify(doc.source),
          doc.text,
          JSON.stringify(doc.metadata),
          doc.entityIds,
        ],
      );
    }
  }

  private async legacyChunkWrites(
    client: { query: (text: string, params: any[]) => Promise<any> },
    chunks: Chunk[],
    ctx: ConnectorContext,
  ) {
    for (const chunk of chunks) {
      const embeddingVector = chunk.embedding ? `[${chunk.embedding.join(',')}]` : null;

      if (embeddingVector) {
        await client.query(
          `INSERT INTO chunks (id, tenant_id, document_id, text, "offset", metadata, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id, tenant_id) DO NOTHING`,
          [
            chunk.id,
            ctx.tenantId,
            chunk.documentId,
            chunk.text,
            chunk.offset,
            JSON.stringify(chunk.metadata),
            embeddingVector,
          ],
        );
      } else {
        await client.query(
          `INSERT INTO chunks (id, tenant_id, document_id, text, "offset", metadata)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id, tenant_id) DO NOTHING`,
          [
            chunk.id,
            ctx.tenantId,
            chunk.documentId,
            chunk.text,
            chunk.offset,
            JSON.stringify(chunk.metadata),
          ],
        );
      }
    }
  }

  private mergeDuplicates(data: {
    entities: Entity[];
    edges: Edge[];
    documents: Document[];
    chunks: Chunk[];
  }) {
    const uniqueEntities = new Map<string, Entity>();
    for (const entity of data.entities) {
      const existing = uniqueEntities.get(entity.id);
      if (!existing) {
        uniqueEntities.set(entity.id, {
          ...entity,
          labels: [...(entity.labels || [])],
          sourceIds: [...(entity.sourceIds || [])],
          properties: { ...(entity.properties || {}) },
        });
      } else {
        uniqueEntities.set(entity.id, {
          ...existing,
          labels: this.mergeDistinct(existing.labels || [], entity.labels || []),
          sourceIds: this.mergeDistinct(existing.sourceIds || [], entity.sourceIds || []),
          properties: { ...(existing.properties || {}), ...(entity.properties || {}) },
        });
      }
    }

    const uniqueEdges = new Map<string, Edge>();
    for (const edge of data.edges) {
      const existing = uniqueEdges.get(edge.id);
      if (!existing) {
        uniqueEdges.set(edge.id, {
          ...edge,
          sourceIds: [...(edge.sourceIds || [])],
          properties: { ...(edge.properties || {}) },
        });
      } else {
        uniqueEdges.set(edge.id, {
          ...existing,
          fromEntityId: edge.fromEntityId,
          toEntityId: edge.toEntityId,
          kind: edge.kind,
          sourceIds: this.mergeDistinct(existing.sourceIds || [], edge.sourceIds || []),
          properties: { ...(existing.properties || {}), ...(edge.properties || {}) },
        });
      }
    }

    const uniqueDocuments = new Map<string, Document>();
    for (const doc of data.documents) {
      const existing = uniqueDocuments.get(doc.id);
      if (!existing) {
        uniqueDocuments.set(doc.id, {
          ...doc,
          entityIds: [...(doc.entityIds || [])],
          metadata: { ...(doc.metadata || {}) },
        });
      } else {
        uniqueDocuments.set(doc.id, {
          ...existing,
          text: doc.text || existing.text,
          title: doc.title || existing.title,
          mimeType: doc.mimeType || existing.mimeType,
          source: doc.source || existing.source,
          metadata: { ...(existing.metadata || {}), ...(doc.metadata || {}) },
          entityIds: this.mergeDistinct(existing.entityIds || [], doc.entityIds || []),
        });
      }
    }

    const uniqueChunks = new Map<string, Chunk>();
    for (const chunk of data.chunks) {
      const existing = uniqueChunks.get(chunk.id);
      if (!existing) {
        uniqueChunks.set(chunk.id, {
          ...chunk,
          metadata: { ...(chunk.metadata || {}) },
        });
      } else {
        uniqueChunks.set(chunk.id, {
          ...existing,
          text: chunk.text || existing.text,
          offset: chunk.offset ?? existing.offset,
          metadata: { ...(existing.metadata || {}), ...(chunk.metadata || {}) },
          embedding: chunk.embedding || existing.embedding,
        });
      }
    }

    return {
      entities: Array.from(uniqueEntities.values()),
      edges: Array.from(uniqueEdges.values()),
      documents: Array.from(uniqueDocuments.values()),
      chunks: Array.from(uniqueChunks.values()),
    };
  }

  private mergeDistinct(valuesA: string[], valuesB: string[]): string[] {
    return Array.from(new Set([...(valuesA || []), ...(valuesB || [])]));
  }
}
