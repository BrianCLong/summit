/**
 * Pipeline Probe
 * Standalone utility to measure GraphRAG pipeline performance
 */

const GRAPH_RAG_URL = process.env.GRAPH_RAG_URL || 'http://localhost:8002/query';
const DEFAULT_QUERY = "What are the core capabilities of the IntelGraph platform?";
const DEFAULT_TENANT = "system-test";

export interface PipelineMetrics {
  latency: {
    total_ms: number;
    entity_extraction_ms: number;
    graph_query_ms: number;
    answer_synthesis_ms: number;
  };
  complexity: {
    nodes_traversed: number;
    documents_searched: number;
    depth: number;
  };
  timestamp: string;
  error?: string;
}

/**
 * Executes a synthetic probe against the GraphRAG pipeline.
 */
export async function runProbe(query = DEFAULT_QUERY, tenantId = DEFAULT_TENANT): Promise<PipelineMetrics> {
  const timestamp = new Date().toISOString();
  try {
    const response = await fetch(GRAPH_RAG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, tenantId })
    });

    if (!response.ok) {
      throw new Error(`GraphRAG service returned ${response.status}`);
    }

    const json = await response.json() as any;
    if (!json?.data?.metadata || !json?.data?.retrievalResult) {
      throw new Error("Invalid API response structure");
    }

    const { metadata, retrievalResult } = json.data;

    // Use reported metrics from the service metadata
    // We report what the service provides, avoiding arbitrary ratios.
    return {
      latency: {
        total_ms: metadata.totalProcessingTimeMs ?? 0,
        entity_extraction_ms: metadata.extractionTimeMs ?? 0,
        graph_query_ms: metadata.retrievalTimeMs ?? 0,
        answer_synthesis_ms: (metadata.fusionTimeMs ?? 0) + (metadata.generationTimeMs ?? 0),
      },
      complexity: {
        nodes_traversed: retrievalResult.totalNodesTraversed ?? 0,
        documents_searched: retrievalResult.totalDocumentsSearched ?? 0,
        depth: retrievalResult.metadata?.maxHopsReached ?? 0
      },
      timestamp
    };
  } catch (error) {
    return {
      latency: { total_ms: 0, entity_extraction_ms: 0, graph_query_ms: 0, answer_synthesis_ms: 0 },
      complexity: { nodes_traversed: 0, documents_searched: 0, depth: 0 },
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// If run directly
const isMain = process.argv[1] && (process.argv[1].endsWith('pipeline_probe.ts') || process.argv[1].endsWith('pipeline_probe.js'));
if (isMain) {
  runProbe().then(metrics => {
    console.log(JSON.stringify(metrics, null, 2));
  });
}
