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
    retrieval_ms: number;
    fusion_ms: number;
    generation_ms: number;
  };
  complexity: {
    nodes_traversed: number;
    documents_searched: number;
  };
  timestamp: string;
}

async function runProbe(query = DEFAULT_QUERY, tenantId = DEFAULT_TENANT): Promise<PipelineMetrics> {
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
    const { metadata, retrievalResult } = json.data;

    return {
      latency: {
        total_ms: metadata.totalProcessingTimeMs,
        retrieval_ms: metadata.retrievalTimeMs,
        fusion_ms: metadata.fusionTimeMs,
        generation_ms: metadata.generationTimeMs,
      },
      complexity: {
        nodes_traversed: retrievalResult.totalNodesTraversed,
        documents_searched: retrievalResult.totalDocumentsSearched,
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Return empty metrics if service is unreachable
    return {
      latency: { total_ms: 0, retrieval_ms: 0, fusion_ms: 0, generation_ms: 0 },
      complexity: { nodes_traversed: 0, documents_searched: 0 },
      timestamp: new Date().toISOString(),
      // @ts-ignore
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// If run directly
if (process.argv[1] && (process.argv[1].endsWith('pipeline_probe.ts') || process.argv[1].endsWith('pipeline_probe.js'))) {
  runProbe().then(metrics => {
    console.log(JSON.stringify(metrics, null, 2));
  });
}

export { runProbe };
