// @ts-nocheck
import { pg } from '../db/pg.js';
import { Logger } from 'pino';

export interface RetrievalQuery {
  tenantId: string;
  queryText: string;
  filters?: {
    entityIds?: string[];
    sourceSystem?: string;
  };
  limit?: number;
}

export interface RetrievalCitation {
  id: string;
  source: string;
  url?: string;
  timestamp: string;
  confidence: number;
}

export interface RetrievalResult {
  snippets: {
    text: string;
    docId: string;
    score: number;
    metadata: any;
    citations: RetrievalCitation[]; // Added citations
    path?: string[]; // Added path rationales
  }[];
}

// Stub for Embedding Service
async function generateEmbedding(text: string): Promise<number[]> {
  // In a real implementation, call OpenAI or local model
  return new Array(1536).fill(0).map(() => Math.random());
}

export class KnowledgeFabricRetrievalService {
  constructor(private logger: Logger) {}

  async search(query: RetrievalQuery): Promise<RetrievalResult> {
    const limit = query.limit || 5;
    const embedding = await generateEmbedding(query.queryText);
    const vectorStr = `[${embedding.join(',')}]`;

    // Hybrid search: Vector similarity + Filters
    // This SQL assumes pgvector is installed and configured
    let sql = `
      SELECT
        text,
        document_id,
        metadata,
        1 - (embedding <=> $1::vector) as score
      FROM document_chunks
      WHERE tenant_id = $2
    `;

    const params: any[] = [vectorStr, query.tenantId];
    let paramIdx = 3;

    if (query.filters?.entityIds && query.filters.entityIds.length > 0) {
      sql += ` AND entity_ids && $${paramIdx}`;
      params.push(query.filters.entityIds);
      paramIdx++;
    }

    sql += ` ORDER BY score DESC LIMIT $${paramIdx}`;
    params.push(limit);

    try {
      const rows = await pg.manyOrNone(sql, params);

      return {
        snippets: rows.map(r => ({
          text: r.text,
          docId: r.document_id,
          score: r.score,
          metadata: r.metadata,
          // Enrich with citations and path rationale
          citations: [
            {
              id: `cit-${r.document_id}`,
              source: r.metadata?.source || 'Knowledge Base',
              url: r.metadata?.url,
              timestamp: new Date().toISOString(),
              confidence: r.score
            }
          ],
          path: ['Query -> Vector Sim -> Document Match']
        }))
      };
    } catch (err: any) {
      this.logger.error({ err, query }, 'Retrieval failed');
      // In development/test if table doesn't exist, return mocks
      if (err.message.includes('relation "document_chunks" does not exist')) {
          return {
              snippets: [
                  {
                      text: "Mock result for testing GraphRAG retrieval.",
                      docId: "mock-1",
                      score: 0.95,
                      metadata: { source: "Mock Source" },
                      citations: [{
                          id: "cit-mock-1",
                          source: "Mock Evidence",
                          timestamp: new Date().toISOString(),
                          confidence: 0.95
                      }],
                      path: ["Query -> Mock -> Result"]
                  }
              ]
          }
      }
      return { snippets: [] };
    }
  }
}
