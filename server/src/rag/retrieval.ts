// @ts-nocheck
import { pg } from '../db/pg.js';
import { Logger } from 'pino';
import { neo } from '../db/neo4j.js';
import { CypherGuard } from './cypherInvariance.js';
import { EvidenceBundle, EvidenceContract, RetrievalCitation, GraphEvidence } from './evidence.js';

export interface RetrievalQuery {
  tenantId: string;
  queryText: string;
  filters?: {
    entityIds?: string[];
    sourceSystem?: string;
  };
  limit?: number;
}

// Keeping old interface for backward compatibility if needed
export interface RetrievalResult {
  snippets: {
    text: string;
    docId: string;
    score: number;
    metadata: any;
    citations: RetrievalCitation[];
    path?: string[];
  }[];
}

// Stub for Embedding Service
async function generateEmbedding(text: string): Promise<number[]> {
  // In a real implementation, call OpenAI or local model
  return new Array(1536).fill(0).map(() => Math.random());
}

export class KnowledgeFabricRetrievalService {
  constructor(private logger: Logger) {}

  async search(query: RetrievalQuery): Promise<EvidenceBundle> {
    const limit = query.limit || 5;
    const embedding = await generateEmbedding(query.queryText);
    const vectorStr = `[${embedding.join(',')}]`;

    // 1. Vector Search (Postgres)
    let vectorResults: any[] = [];
    try {
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

      vectorResults = await pg.manyOrNone(sql, params);
      if (!vectorResults) {
        vectorResults = [];
      }
    } catch (err: any) {
      this.logger.error({ err, query }, 'Vector retrieval failed or table missing');
      // Fallback for dev/test
      if (err.message.includes('relation "document_chunks" does not exist')) {
        vectorResults = [{
          text: "Mock result for testing GraphRAG retrieval.",
          document_id: "mock-1",
          score: 0.95,
          metadata: { source: "Mock Source" }
        }];
      }
    }

    // 2. Graph Search (Neo4j) - Enforcing Invariants
    const graphEvidence = await this.graphSearch(query);

    // 3. Construct Evidence Bundle
    const contract: EvidenceContract = {
      contractId: `evt-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      schemaVersion: "1.0.0",
      manifest: {
        queryId: `qry-${Date.now()}`,
        timestamp: new Date().toISOString(),
        strategy: 'HYBRID',
        parameters: { limit, hasFilters: !!query.filters },
        sources: ['postgres:document_chunks', 'neo4j:knowledge_graph']
      },
      citations: vectorResults.map(r => ({
        id: `cit-${r.document_id}`,
        source: r.metadata?.source || 'Knowledge Base',
        url: r.metadata?.url,
        timestamp: new Date().toISOString(),
        confidence: r.score,
        snippet: r.text,
        supportingGraphIds: [] // Todo: link to graph nodes if shared ID
      })),
      graphEvidence: graphEvidence,
      provenance: null // In real flow, we would link to a provenance entry
    };

    return {
      results: [contract],
      metadata: {
        totalTimeMs: 0,
        totalTokens: 0
      }
    };
  }

  async graphSearch(query: RetrievalQuery): Promise<GraphEvidence | undefined> {
    // Basic graph exploration based on filters
    const entityIds = query.filters?.entityIds || [];

    // If no entities to start from, return undefined for now (could do text search in graph later)
    if (entityIds.length === 0) {
      return undefined;
    }

    // Query: Find neighborhood of entities, enforcing invariants
    // We explicitly include ORDER BY to satisfy CypherGuard strictness if enabled later
    const cypher = `
      MATCH (n)
      WHERE n.id IN $entityIds
      OPTIONAL MATCH (n)-[r]-(m)
      RETURN n, r, m
      ORDER BY n.id, type(r), m.id
    `;

    // Enforce Invariants (injects LIMIT if missing)
    const safeCypher = CypherGuard.enforceInvariants(cypher, { strict: false, defaultLimit: 50 });

    try {
      const result = await neo.run(safeCypher, { entityIds });

      const nodesMap = new Map<string, any>();
      const relationships: any[] = [];

      // Transform Neo4j result to GraphEvidence shape
      result.records.forEach(record => {
         const n = record.get('n');
         if (n && n.properties) {
             const id = n.properties.id || n.identity.toString();
             if (!nodesMap.has(id)) {
                 nodesMap.set(id, {
                     id,
                     labels: n.labels,
                     properties: n.properties,
                     importance: { pageRank: n.properties.pageRank }
                 });
             }
         }

         const m = record.get('m');
         if (m && m.properties) {
             const id = m.properties.id || m.identity.toString();
             if (!nodesMap.has(id)) {
                 nodesMap.set(id, {
                     id,
                     labels: m.labels,
                     properties: m.properties,
                     importance: { pageRank: m.properties.pageRank }
                 });
             }
         }

         const r = record.get('r');
         if (r && r.properties) {
             relationships.push({
                 id: r.identity.toString(),
                 start: r.start.toString(),
                 end: r.end.toString(),
                 type: r.type,
                 properties: r.properties
             });
         }
      });

      return {
        nodes: Array.from(nodesMap.values()),
        relationships,
        stateHash: "hash-placeholder" // Compute hash of nodes+rels for strict verification
      };
    } catch (err) {
      this.logger.error({ err }, 'Graph retrieval failed');
      return undefined;
    }
  }
}
