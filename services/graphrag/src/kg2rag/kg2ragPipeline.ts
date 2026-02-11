import { Kg2RagParams, Kg2RagSeed, Kg2RagSubgraph, RetrievalContext, GraphNode, GraphEdge } from "./types.js";
import { Driver } from 'neo4j-driver';
import { EvidenceChunk } from '../types/index.js';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('kg2rag-pipeline');

// Minimal interface for DocumentRetriever
export interface IDocumentRetriever {
  retrieve(query: any): Promise<EvidenceChunk[]>;
}

export class Kg2RagPipeline {
  constructor(
    private readonly deps: {
      documentRetriever: IDocumentRetriever;
      driver: Driver;
    }
  ) {}

  async buildSeedSet(query: string, params: Kg2RagParams): Promise<Kg2RagSeed> {
    return tracer.startActiveSpan('kg2rag.buildSeedSet', async (span) => {
      try {
        // 1. Retrieve chunks using DocumentRetriever
        const seedChunks = await this.deps.documentRetriever.retrieve({
          query,
          tenantId: params.tenantId,
          maxDocuments: 5, // Default for seed
          minRelevance: 0.5,
        });

        span.setAttribute('seedChunks.count', seedChunks.length);

        // 2. Map chunks to nodes
        // Assuming documents are linked to entities in the graph via MENTIONS relationship
        const docIds = seedChunks.map(c => c.id);
        const session = this.deps.driver.session();
        let seedNodes: GraphNode[] = [];

        try {
          if (docIds.length > 0) {
            // Query to find entities mentioned in the documents
            const result = await session.run(
              `
              MATCH (d:Document)-[:MENTIONS]->(e:Entity)
              WHERE d.id IN $docIds AND d.tenantId = $tenantId
              RETURN e, count(d) as mentions
              ORDER BY mentions DESC
              LIMIT $maxNodes
              `,
              { docIds, tenantId: params.tenantId, maxNodes: params.maxNodes || 10 }
            );

            seedNodes = result.records.map(r => {
              const node = r.get('e');
              return {
                id: node.properties.id,
                type: node.labels[0],
                label: node.properties.name || node.properties.id,
                properties: node.properties,
                saliency: 1.0 // Seed nodes have high saliency
              };
            });
          }
        } catch (e) {
          span.recordException(e as Error);
          console.warn("KG2RAG: Error mapping chunks to nodes (skipping step)", e);
        } finally {
          await session.close();
        }

        span.setAttribute('seedNodes.count', seedNodes.length);
        return { query, seedChunks, seedNodes };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async expandViaGraph(seed: Kg2RagSeed, params: Kg2RagParams): Promise<Kg2RagSubgraph> {
    return tracer.startActiveSpan('kg2rag.expandViaGraph', async (span) => {
      const seedNodeIds = seed.seedNodes.map(n => n.id);
      if (seedNodeIds.length === 0) {
        return { nodes: [], edges: [], truncated: false };
      }

      const session = this.deps.driver.session();
      let nodes: GraphNode[] = [...seed.seedNodes];
      let edges: GraphEdge[] = [];
      let truncated = false;

      try {
        // Constrained expansion using standard Cypher
        const maxHops = params.maxHops || 2;
        const maxNodes = params.maxNodes || 100;

        const safeHops = Math.min(Math.max(1, maxHops), 5); // strict clamp

        // Security: Enforce tenant isolation on ALL nodes in the path
        const resultCypher = await session.run(
          `
          MATCH p=(s:Entity)-[*1..${safeHops}]-(t:Entity)
          WHERE s.id IN $seedNodeIds AND s.tenantId = $tenantId
          AND ALL(n IN nodes(p) WHERE n.tenantId = $tenantId)
          RETURN p
          LIMIT $maxNodes
          `,
          { seedNodeIds, tenantId: params.tenantId, maxNodes }
        );

        // Parse paths
        const seenNodes = new Set(nodes.map(n => n.id));
        const seenEdges = new Set<string>();

        for (const record of resultCypher.records) {
          const path = record.get('p');
          for (const segment of path.segments) {
              const start = segment.start;
              const end = segment.end;
              const rel = segment.relationship;

              if (!seenNodes.has(start.properties.id)) {
                  nodes.push({
                      id: start.properties.id,
                      type: start.labels[0],
                      label: start.properties.name || start.properties.id,
                      properties: start.properties
                  });
                  seenNodes.add(start.properties.id);
              }
              if (!seenNodes.has(end.properties.id)) {
                  nodes.push({
                      id: end.properties.id,
                      type: end.labels[0],
                      label: end.properties.name || end.properties.id,
                      properties: end.properties
                  });
                  seenNodes.add(end.properties.id);
              }

              const edgeId = rel.properties.id || rel.identity.toString();
              if (!seenEdges.has(edgeId)) {
                  edges.push({
                      id: edgeId,
                      type: rel.type,
                      sourceId: start.properties.id,
                      targetId: end.properties.id,
                      properties: rel.properties
                  });
                  seenEdges.add(edgeId);
              }
          }
        }

        if (nodes.length >= maxNodes) truncated = true;

        span.setAttribute('nodes.count', nodes.length);
        span.setAttribute('edges.count', edges.length);
        span.setAttribute('truncated', truncated);

      } catch (e) {
        span.recordException(e as Error);
        console.error("KG2RAG: Expansion failed", e);
      } finally {
        await session.close();
        span.end();
      }

      return { nodes, edges, truncated };
    });
  }

  organizeContext(subgraph: Kg2RagSubgraph, query: string, params: Kg2RagParams): RetrievalContext {
    // Deterministic sorting: by Saliency (if available), then Degree (calculated), then ID

    // Calculate degree
    const degreeMap = new Map<string, number>();
    subgraph.edges.forEach(e => {
        degreeMap.set(e.sourceId, (degreeMap.get(e.sourceId) || 0) + 1);
        degreeMap.set(e.targetId, (degreeMap.get(e.targetId) || 0) + 1);
    });

    const sortedNodes = [...subgraph.nodes].sort((a, b) => {
        // Higher score first
        const scoreA = (a.saliency || 0) * 100 + (degreeMap.get(a.id) || 0);
        const scoreB = (b.saliency || 0) * 100 + (degreeMap.get(b.id) || 0);

        if (scoreB !== scoreA) return scoreB - scoreA;
        // Tie breaker: ID ascending
        return a.id.localeCompare(b.id);
    });

    // Generate paragraphs
    const paragraphs = sortedNodes.map(n => {
        const props = Object.entries(n.properties)
            .filter(([k]) => k !== 'id' && k !== 'tenantId' && k !== 'name')
            .map(([k, v]) => `${k}: ${v}`).join(', ');

        return `${n.label} (${n.type}): ${props}`;
    });

    return {
        paragraphs,
        provenance: {
            nodes: sortedNodes,
            edges: subgraph.edges
        },
        debug: {
            nodeCount: sortedNodes.length,
            edgeCount: subgraph.edges.length,
            truncated: subgraph.truncated,
            query
        }
    };
  }
}
