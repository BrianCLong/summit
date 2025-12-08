import { Pool, PoolClient } from 'pg';
import { KnowledgeObject, EmbeddingRecord, RetrievalQuery, RetrievalResultItem, TenantId, RetrievalQueryKind, KnowledgeObjectKind } from './types.js';
import logger from '../utils/logger.js';
import { performance } from 'perf_hooks';

export class KnowledgeRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async upsertKnowledgeObject(obj: KnowledgeObject): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO knowledge_objects (
          id, tenant_id, kind, title, body, metadata,
          source_pipeline_key, source_id, original_uri,
          created_at, updated_at, effective_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          kind = EXCLUDED.kind,
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          metadata = EXCLUDED.metadata,
          source_pipeline_key = EXCLUDED.source_pipeline_key,
          source_id = EXCLUDED.source_id,
          original_uri = EXCLUDED.original_uri,
          updated_at = NOW(),
          effective_at = EXCLUDED.effective_at;
        `,
        [
          obj.id, obj.tenantId, obj.kind, obj.title, obj.body, obj.metadata,
          obj.source.pipelineKey, obj.source.sourceId, obj.source.originalUri,
          obj.timestamps.createdAt, obj.timestamps.updatedAt || new Date(), obj.timestamps.effectiveAt
        ]
      );
    } finally {
      client.release();
    }
  }

  async upsertEmbedding(emb: EmbeddingRecord): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Ensure vector is formatted for pgvector
      const vectorStr = JSON.stringify(emb.vector);

      await client.query(
        `INSERT INTO embedding_records (
          id, tenant_id, object_id, kind, provider, model, dim, vector, created_at, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          object_id = EXCLUDED.object_id,
          kind = EXCLUDED.kind,
          provider = EXCLUDED.provider,
          model = EXCLUDED.model,
          dim = EXCLUDED.dim,
          vector = EXCLUDED.vector,
          created_at = EXCLUDED.created_at,
          version = EXCLUDED.version;
        `,
        [
          emb.id, emb.tenantId, emb.objectId, emb.kind, emb.provider, emb.model, emb.dim, vectorStr, emb.createdAt, emb.version
        ]
      );
    } finally {
      client.release();
    }
  }

  async deleteObject(tenantId: string, objectId: string): Promise<void> {
     await this.pool.query(
       `DELETE FROM knowledge_objects WHERE id = $1 AND tenant_id = $2`,
       [objectId, tenantId]
     );
  }

  // --- Search Methods ---

  async searchKeyword(query: RetrievalQuery): Promise<RetrievalResultItem[]> {
    const client = await this.pool.connect();
    try {
      // Basic Full Text Search
      const whereConditions = [`ko.tenant_id = $1`];
      const params: any[] = [query.tenantId];
      let pIdx = 2;

      // Filter by kind
      if (query.filters?.kinds?.length) {
        whereConditions.push(`ko.kind = ANY($${pIdx})`);
        params.push(query.filters.kinds);
        pIdx++;
      }

      // Metadata filters (simple key-value check for now, can be expanded to jsonb containment)
      if (query.filters?.metadata) {
          whereConditions.push(`ko.metadata @> $${pIdx}`);
          params.push(query.filters.metadata);
          pIdx++;
      }

      // Time range
      if (query.filters?.timeRange?.from) {
          whereConditions.push(`ko.created_at >= $${pIdx}`);
          params.push(query.filters.timeRange.from);
          pIdx++;
      }
      if (query.filters?.timeRange?.to) {
          whereConditions.push(`ko.created_at <= $${pIdx}`);
          params.push(query.filters.timeRange.to);
          pIdx++;
      }

      // Full Text Search Condition
      params.push(query.queryText);
      const qIdx = pIdx;

      const sql = `
        SELECT
          ko.*,
          ts_rank(to_tsvector('english', coalesce(ko.title, '') || ' ' || coalesce(ko.body, '')), plainto_tsquery('english', $${qIdx})) as rank
        FROM knowledge_objects ko
        WHERE ${whereConditions.join(' AND ')}
          AND to_tsvector('english', coalesce(ko.title, '') || ' ' || coalesce(ko.body, '')) @@ plainto_tsquery('english', $${qIdx})
        ORDER BY rank DESC
        LIMIT ${query.topK || 10}
      `;

      const res = await client.query(sql, params);
      return res.rows.map(this.mapRowToResultItem);
    } finally {
      client.release();
    }
  }

  async searchVector(query: RetrievalQuery, embeddingVector: number[]): Promise<RetrievalResultItem[]> {
    const client = await this.pool.connect();
    try {
      const vectorStr = JSON.stringify(embeddingVector);

      const whereConditions = [`ko.tenant_id = $1`];
      const params: any[] = [query.tenantId];
      let pIdx = 2;

      // Filter by kind
      if (query.filters?.kinds?.length) {
        whereConditions.push(`ko.kind = ANY($${pIdx})`);
        params.push(query.filters.kinds);
        pIdx++;
      }

       // Metadata filters
       if (query.filters?.metadata) {
        whereConditions.push(`ko.metadata @> $${pIdx}`);
        params.push(query.filters.metadata);
        pIdx++;
      }

      // Time range
      if (query.filters?.timeRange?.from) {
        whereConditions.push(`ko.created_at >= $${pIdx}`);
        params.push(query.filters.timeRange.from);
        pIdx++;
      }
      if (query.filters?.timeRange?.to) {
        whereConditions.push(`ko.created_at <= $${pIdx}`);
        params.push(query.filters.timeRange.to);
        pIdx++;
      }

      // We join embedding_records. Note: multiple embeddings could exist per object?
      // For now assume one primary embedding or take the max similarity.
      params.push(vectorStr);
      const vecParamIdx = pIdx;

      // Note: We select from knowledge_objects joined with embedding_records
      const sql = `
        SELECT
          ko.*,
          (1 - (er.vector <=> $${vecParamIdx}::vector)) as similarity
        FROM knowledge_objects ko
        JOIN embedding_records er ON ko.id = er.object_id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY similarity DESC
        LIMIT ${query.topK || 10}
      `;

      const res = await client.query(sql, params);
      return res.rows.map(row => this.mapRowToResultItem(row, row.similarity));
    } finally {
      client.release();
    }
  }

  // Mapping helper
  private mapRowToResultItem(row: any, score?: number): RetrievalResultItem {
    return {
      object: {
        id: row.id,
        tenantId: row.tenant_id,
        kind: row.kind as KnowledgeObjectKind,
        title: row.title,
        body: row.body,
        metadata: row.metadata,
        source: {
          pipelineKey: row.source_pipeline_key,
          sourceId: row.source_id,
          originalUri: row.original_uri
        },
        timestamps: {
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          effectiveAt: row.effective_at
        }
      },
      score: score ?? row.rank ?? 0
    };
  }
}
