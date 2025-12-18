import { Entity, Edge, Document, Chunk, ConnectorContext } from '../data-model/types';
import { Pool } from 'pg';
import { getNeo4jDriver } from '../config/database';

export class IndexingService {
  private pgPool: Pool;

  constructor() {
    // Assuming process.env.DATABASE_URL is set
    this.pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async index(
    data: { entities: Entity[]; edges: Edge[]; documents: Document[]; chunks: Chunk[] },
    ctx: ConnectorContext
  ): Promise<void> {
    const client = await this.pgPool.connect();

    try {
      await client.query('BEGIN');

      // 1. Write Entities (Postgres)
      for (const entity of data.entities) {
        await client.query(
          `INSERT INTO entities (id, tenant_id, kind, labels, properties, source_ids)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id, tenant_id) DO UPDATE SET
             properties = EXCLUDED.properties,
             updated_at = NOW()`,
          [entity.id, ctx.tenantId, entity.kind, entity.labels, JSON.stringify(entity.properties), entity.sourceIds]
        );
      }

      // 2. Write Edges (Postgres)
      for (const edge of data.edges) {
        await client.query(
          `INSERT INTO edges (id, tenant_id, from_entity_id, to_entity_id, kind, properties, source_ids)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id, tenant_id) DO NOTHING`,
          [edge.id, ctx.tenantId, edge.fromEntityId, edge.toEntityId, edge.kind, JSON.stringify(edge.properties), edge.sourceIds]
        );
      }

      // 3. Write Documents (Postgres)
      for (const doc of data.documents) {
        await client.query(
          `INSERT INTO documents (id, tenant_id, title, mime_type, source, text, metadata, entity_ids)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id, tenant_id) DO UPDATE SET
             text = EXCLUDED.text,
             updated_at = NOW()`,
          [doc.id, ctx.tenantId, doc.title, doc.mimeType, JSON.stringify(doc.source), doc.text, JSON.stringify(doc.metadata), doc.entityIds]
        );
      }

      // 4. Write Chunks + Embeddings (Postgres pgvector)
      for (const chunk of data.chunks) {
        // Assume embedding is already computed or computed here
        // For MVP, we skip embedding call or mock it
        const embeddingVector = chunk.embedding ? `[${chunk.embedding.join(',')}]` : null;

        // Note: Requires pgvector extension enabled on DB
        if (embeddingVector) {
           await client.query(
            `INSERT INTO chunks (id, tenant_id, document_id, text, "offset", metadata, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id, tenant_id) DO NOTHING`,
            [chunk.id, ctx.tenantId, chunk.documentId, chunk.text, chunk.offset, JSON.stringify(chunk.metadata), embeddingVector]
          );
        } else {
           await client.query(
            `INSERT INTO chunks (id, tenant_id, document_id, text, "offset", metadata)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id, tenant_id) DO NOTHING`,
            [chunk.id, ctx.tenantId, chunk.documentId, chunk.text, chunk.offset, JSON.stringify(chunk.metadata)]
          );
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // 5. Write to Neo4j (Graph)
    await this.syncToNeo4j(data, ctx);
  }

  private async syncToNeo4j(data: { entities: Entity[]; edges: Edge[] }, ctx: ConnectorContext) {
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
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
    } catch (e) {
      // Log but don't fail the whole batch if graph sync fails (dual-write problem)
      // Ideally use an event bus for reliable eventual consistency
      console.error('Failed to sync to Neo4j', e);
    } finally {
      await session.close();
    }
  }
}
