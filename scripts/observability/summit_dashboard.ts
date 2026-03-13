/**
 * Summit Observability Dashboard
 * Generates a unified JSON report of Summit pipeline health and performance
 */

import { runProbe } from '../metrics/pipeline_probe.ts';
import { scrapeMetrics } from '../metrics/scraper.ts';

export interface DashboardReport {
  status: 'online' | 'degraded' | 'offline';
  pipeline: {
    latency_probe_ms: number;
    stages: {
      entity_extraction: number;
      graph_query: number;
      answer_synthesis: number;
    };
    complexity: {
      avg_nodes_traversed: number;
      avg_docs_searched: number;
      avg_depth: number;
    };
  };
  operational: {
    counters: Array<{
      name: string;
      total: number;
      errors: number;
    }>;
  };
  timestamp: string;
}

export async function generateDashboard(): Promise<DashboardReport> {
  const [probeResults, systemMetrics] = await Promise.all([
    runProbe(),
    scrapeMetrics()
  ]);

  const isOffline = !!(probeResults.error || systemMetrics.error);

  const totalErrors = systemMetrics.components.reduce((acc, curr) => acc + curr.error_count, 0);
  const totalRequests = systemMetrics.components.reduce((acc, curr) => acc + curr.total_count, 0);
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  return {
    status: isOffline ? 'offline' : (errorRate > 5 ? 'degraded' : 'online'),
    pipeline: {
      latency_probe_ms: probeResults.latency.total_ms,
      stages: {
        entity_extraction: probeResults.latency.entity_extraction_ms,
        graph_query: probeResults.latency.graph_query_ms,
        answer_synthesis: probeResults.latency.answer_synthesis_ms,
      },
      complexity: {
        avg_nodes_traversed: probeResults.complexity.nodes_traversed,
        avg_docs_searched: probeResults.complexity.documents_searched,
        avg_depth: probeResults.complexity.depth
      }
    },
    operational: {
      counters: systemMetrics.components.map(c => ({
        name: c.component,
        total: c.total_count,
        errors: c.error_count
      }))
    },
    timestamp: new Date().toISOString()
  };
}

// Main execution
const isMain = process.argv[1] && (process.argv[1].endsWith('summit_dashboard.ts') || process.argv[1].endsWith('summit_dashboard.js'));

if (isMain) {
  generateDashboard().then(report => {
    console.log(JSON.stringify(report, null, 2));
  }).catch(err => {
    console.error('Failed to generate dashboard:', err);
    process.exit(1);
  });
}
