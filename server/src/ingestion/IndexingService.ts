import { Entity, Edge, Document, Chunk, ConnectorContext } from "../data-model/types.js";
import { Pool } from "pg";
import { Driver } from "neo4j-driver";
import { getNeo4jDriver } from "../config/database.js";

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
  private static readonly CANONICAL_RELATIONSHIP_TYPES = new Set(["MENTIONS", "DERIVES_FROM"]);
  private static readonly INDICATOR_KIND_HINTS = new Set(["indicator", "ioc"]);
  private static readonly SOURCE_KIND_HINTS = new Set([
    "source",
    "document_source",
    "media_source",
  ]);

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
        : process.env.BATCH_WRITES_V1 === "1";
  }

  async index(
    data: { entities: Entity[]; edges: Edge[]; documents: Document[]; chunks: Chunk[] },
    ctx: ConnectorContext
  ): Promise<void> {
    const writeSet = this.useBatchWrites ? this.mergeDuplicates(data) : data;
    const client = await this.pgPool.connect();

    try {
      await client.query("BEGIN");

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

      await client.query("COMMIT");
    } catch (e: any) {
      await client.query("ROLLBACK");
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
        await this.upsertNeo4jEntities(session, data.entities, ctx.tenantId);
        await this.upsertNeo4jEdges(session, data.edges, ctx.tenantId);
      } else {
        await this.upsertNeo4jEntities(session, data.entities, ctx.tenantId);
        await this.upsertNeo4jEdges(session, data.edges, ctx.tenantId);
      }
    } catch (e: any) {
      // Log but don't fail the whole batch if graph sync fails (dual-write problem)
      // Ideally use an event bus for reliable eventual consistency
      console.error("Failed to sync to Neo4j", e);
    } finally {
      await session.close();
    }
  }

  private normalizeRelationshipType(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_");
    if (!normalized) return null;
    return normalized;
  }

  private deriveRelationshipType(edge: Edge): "MENTIONS" | "DERIVES_FROM" | "RELATIONSHIP" {
    const candidates = [
      (edge.properties as any)?.relationshipType,
      (edge.properties as any)?.type,
      (edge.properties as any)?.predicate,
      edge.kind,
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeRelationshipType(candidate);
      if (normalized && IndexingService.CANONICAL_RELATIONSHIP_TYPES.has(normalized)) {
        return normalized as "MENTIONS" | "DERIVES_FROM";
      }
    }

    return "RELATIONSHIP";
  }

  private deriveEntityNodeType(entity: Entity): "Entity" | "Indicator" | "Source" {
    const lowerKind = entity.kind?.toLowerCase?.() || "";
    if (IndexingService.INDICATOR_KIND_HINTS.has(lowerKind)) return "Indicator";
    if (IndexingService.SOURCE_KIND_HINTS.has(lowerKind)) return "Source";

    const labels = (entity.labels || []).map((label) => String(label).toLowerCase());
    if (labels.includes("indicator")) return "Indicator";
    if (labels.includes("source")) return "Source";

    return "Entity";
  }

  private buildEntityIdempotencyToken(tenantId: string, entityId: string): string {
    return `${tenantId}:entity:${entityId}`;
  }

  private buildEdgeIdempotencyToken(tenantId: string, edgeId: string): string {
    return `${tenantId}:edge:${edgeId}`;
  }

  private async runNeo4jWrite(
    session: any,
    cypher: string,
    params: Record<string, unknown>
  ): Promise<void> {
    if (typeof session.executeWrite === "function") {
      await session.executeWrite((tx: any) => tx.run(cypher, params));
      return;
    }

    if (typeof session.writeTransaction === "function") {
      await session.writeTransaction((tx: any) => tx.run(cypher, params));
      return;
    }

    await session.run(cypher, params);
  }

  private async upsertNeo4jEntities(
    session: any,
    entities: Entity[],
    tenantId: string
  ): Promise<void> {
    if (entities.length === 0) return;

    const rows = entities.map((entity) => ({
      id: entity.id,
      tenantId,
      kind: entity.kind,
      labels: entity.labels,
      props: entity.properties || {},
      nodeType: this.deriveEntityNodeType(entity),
      idempotencyToken: this.buildEntityIdempotencyToken(tenantId, entity.id),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }));

    await this.runNeo4jWrite(
      session,
      `UNWIND $entities AS entity
       MERGE (e:Entity {id: entity.id, tenantId: entity.tenantId})
       ON CREATE SET e.createdAt = coalesce(entity.createdAt, datetime())
       SET e.kind = entity.kind,
           e.labels = entity.labels,
           e += entity.props,
           e.updatedAt = coalesce(entity.updatedAt, datetime()),
           e.idempotency_token = entity.idempotencyToken
       FOREACH (_ IN CASE WHEN entity.nodeType = 'Indicator' THEN [1] ELSE [] END | SET e:Indicator)
       FOREACH (_ IN CASE WHEN entity.nodeType = 'Source' THEN [1] ELSE [] END | SET e:Source)`,
      { entities: rows }
    );
  }

  private relationshipUpsertCypher(
    relationshipType: "MENTIONS" | "DERIVES_FROM" | "RELATIONSHIP"
  ): string {
    return `UNWIND $edges AS edge
            MATCH (from:Entity {id: edge.fromId, tenantId: edge.tenantId})
            MATCH (to:Entity {id: edge.toId, tenantId: edge.tenantId})
            MERGE (s:IngestRelationshipIdempotency {idempotency_token: edge.idempotencyToken})
              ON CREATE SET s.edgeId = edge.id, s.createdAt = datetime()
            WITH edge, from, to, s
            FOREACH (_ IN CASE WHEN coalesce(s.applied, false) THEN [] ELSE [1] END |
              MERGE (from)-[r:${relationshipType} {id: edge.id, tenantId: edge.tenantId}]->(to)
                ON CREATE SET r.createdAt = datetime()
              SET r += edge.props,
                  r.kind = edge.kind,
                  r.updatedAt = datetime(),
                  r.idempotency_token = edge.idempotencyToken,
                  s.applied = true,
                  s.updatedAt = datetime()
            )
            WITH edge, from, to
            MATCH (from)-[r:${relationshipType} {id: edge.id, tenantId: edge.tenantId}]->(to)
            SET r += edge.props,
                r.kind = edge.kind,
                r.updatedAt = datetime(),
                r.idempotency_token = edge.idempotencyToken`;
  }

  private async upsertNeo4jEdges(session: any, edges: Edge[], tenantId: string): Promise<void> {
    if (edges.length === 0) return;

    const groupedEdges = new Map<"MENTIONS" | "DERIVES_FROM" | "RELATIONSHIP", any[]>([
      ["MENTIONS", []],
      ["DERIVES_FROM", []],
      ["RELATIONSHIP", []],
    ]);

    for (const edge of edges) {
      const relationshipType = this.deriveRelationshipType(edge);
      const bucket = groupedEdges.get(relationshipType) || [];
      bucket.push({
        id: edge.id,
        fromId: edge.fromEntityId,
        toId: edge.toEntityId,
        tenantId,
        kind: edge.kind,
        props: edge.properties || {},
        idempotencyToken: this.buildEdgeIdempotencyToken(tenantId, edge.id),
      });
      groupedEdges.set(relationshipType, bucket);
    }

    for (const [relationshipType, rows] of groupedEdges.entries()) {
      if (rows.length === 0) continue;
      await this.runNeo4jWrite(session, this.relationshipUpsertCypher(relationshipType), {
        edges: rows,
      });
    }
  }

  private async deferConstraints(
    client: { query: (text: string) => Promise<any> },
    ctx: ConnectorContext
  ) {
    try {
      await client.query("SET CONSTRAINTS ALL DEFERRED");
      ctx.logger?.debug?.("Deferred constraints for batch ingest");
    } catch (error: any) {
      ctx.logger?.debug?.(
        { error },
        "Unable to defer constraints (continuing with immediate checks)"
      );
    }
  }

  private async batchUpsertEntities(
    client: { query: (text: string, params: any[]) => Promise<any> },
    entities: Entity[],
    ctx: ConnectorContext
  ) {
    if (entities.length === 0) return;

    const placeholders: string[] = [];
    const params: any[] = [];

    entities.forEach((entity, idx) => {
      const base = idx * 6;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
      );
      params.push(
        entity.id,
        ctx.tenantId,
        entity.kind,
        entity.labels || [],
        JSON.stringify(entity.properties || {}),
        entity.sourceIds || []
      );
    });

    const query = `
      INSERT INTO entities (id, tenant_id, kind, labels, properties, source_ids)
      VALUES ${placeholders.join(", ")}
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
    ctx.logger?.debug?.(
      { count: entities.length, ms: Date.now() - start },
      "Batch upserted entities"
    );
  }

  private async batchUpsertEdges(
    client: { query: (text: string, params: any[]) => Promise<any> },
    edges: Edge[],
    ctx: ConnectorContext
  ) {
    if (edges.length === 0) return;

    const placeholders: string[] = [];
    const params: any[] = [];

    edges.forEach((edge, idx) => {
      const base = idx * 7;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`
      );
      params.push(
        edge.id,
        ctx.tenantId,
        edge.fromEntityId,
        edge.toEntityId,
        edge.kind,
        JSON.stringify(edge.properties || {}),
        edge.sourceIds || []
      );
    });

    const query = `
      INSERT INTO edges (id, tenant_id, from_entity_id, to_entity_id, kind, properties, source_ids)
      VALUES ${placeholders.join(", ")}
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
    ctx.logger?.debug?.({ count: edges.length, ms: Date.now() - start }, "Batch upserted edges");
  }

  private async batchUpsertDocuments(
    client: { query: (text: string, params: any[]) => Promise<any> },
    documents: Document[],
    ctx: ConnectorContext
  ) {
    if (documents.length === 0) return;

    const placeholders: string[] = [];
    const params: any[] = [];

    documents.forEach((doc, idx) => {
      const base = idx * 8;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
      );
      params.push(
        doc.id,
        ctx.tenantId,
        doc.title || null,
        doc.mimeType || null,
        doc.source ? JSON.stringify(doc.source) : null,
        doc.text,
        JSON.stringify(doc.metadata || {}),
        doc.entityIds || []
      );
    });

    const query = `
      INSERT INTO documents (id, tenant_id, title, mime_type, source, text, metadata, entity_ids)
      VALUES ${placeholders.join(", ")}
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
    ctx.logger?.debug?.(
      { count: documents.length, ms: Date.now() - start },
      "Batch upserted documents"
    );
  }

  private async batchUpsertChunks(
    client: { query: (text: string, params: any[]) => Promise<any> },
    chunks: Chunk[],
    ctx: ConnectorContext
  ) {
    if (chunks.length === 0) return;

    const placeholders: string[] = [];
    const params: any[] = [];

    chunks.forEach((chunk, idx) => {
      const base = idx * 7;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`
      );
      const embeddingVector = chunk.embedding ? `[${chunk.embedding.join(",")}]` : null;
      params.push(
        chunk.id,
        ctx.tenantId,
        chunk.documentId,
        chunk.text,
        chunk.offset,
        JSON.stringify(chunk.metadata || {}),
        embeddingVector
      );
    });

    const query = `
      INSERT INTO chunks (id, tenant_id, document_id, text, "offset", metadata, embedding)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (id, tenant_id) DO UPDATE SET
        text = EXCLUDED.text,
        metadata = COALESCE(chunks.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        "offset" = COALESCE(EXCLUDED."offset", chunks."offset"),
        embedding = COALESCE(EXCLUDED.embedding, chunks.embedding);
    `;

    const start = Date.now();
    await client.query(query, params);
    ctx.logger?.debug?.({ count: chunks.length, ms: Date.now() - start }, "Batch upserted chunks");
  }

  private async legacyEntityWrites(
    client: { query: (text: string, params: any[]) => Promise<any> },
    entities: Entity[],
    ctx: ConnectorContext
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
        ]
      );
    }
  }

  private async legacyEdgeWrites(
    client: { query: (text: string, params: any[]) => Promise<any> },
    edges: Edge[],
    ctx: ConnectorContext
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
        ]
      );
    }
  }

  private async legacyDocumentWrites(
    client: { query: (text: string, params: any[]) => Promise<any> },
    documents: Document[],
    ctx: ConnectorContext
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
        ]
      );
    }
  }

  private async legacyChunkWrites(
    client: { query: (text: string, params: any[]) => Promise<any> },
    chunks: Chunk[],
    ctx: ConnectorContext
  ) {
    for (const chunk of chunks) {
      const embeddingVector = chunk.embedding ? `[${chunk.embedding.join(",")}]` : null;

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
          ]
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
          ]
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
