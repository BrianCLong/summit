/**
 * Summit Observability Dashboard
 * Generates a unified JSON report of Summit pipeline health and performance
 */

import { runProbe } from '../metrics/pipeline_probe.ts';
import { scrapeMetrics } from '../metrics/scraper.ts';

export interface DashboardReport {
  status: 'online' | 'degraded' | 'offline';
  pipeline: {
    latency_p95_ms: number;
    stages: {
      retrieval: number;
      fusion: number;
      generation: number;
    };
    complexity: {
      avg_nodes_traversed: number;
      avg_docs_searched: number;
    };
  };
  operational: {
    throughput_qps: number;
    error_rate_percent: number;
    components: Array<{
      name: string;
      throughput: number;
      error_rate: number;
    }>;
  };
  timestamp: string;
}

export async function generateDashboard(): Promise<DashboardReport> {
  const [probeResults, systemMetrics] = await Promise.all([
    runProbe(),
    scrapeMetrics()
  ]);

  const hasErrors = (probeResults as any).error || (systemMetrics as any).error;

  const avgThroughput = systemMetrics.components.reduce((acc, curr) => acc + curr.throughput, 0) / systemMetrics.components.length;
  const avgErrorRate = systemMetrics.components.reduce((acc, curr) => acc + curr.error_rate, 0) / systemMetrics.components.length;

  return {
    status: hasErrors ? 'offline' : (avgErrorRate > 5 ? 'degraded' : 'online'),
    pipeline: {
      latency_p95_ms: probeResults.latency.total_ms,
      stages: {
        retrieval: probeResults.latency.retrieval_ms,
        fusion: probeResults.latency.fusion_ms,
        generation: probeResults.latency.generation_ms,
      },
      complexity: {
        avg_nodes_traversed: probeResults.complexity.nodes_traversed,
        avg_docs_searched: probeResults.complexity.documents_searched,
      }
    },
    operational: {
      throughput_qps: avgThroughput,
      error_rate_percent: avgErrorRate,
      components: systemMetrics.components.map(c => ({
        name: c.component,
        throughput: c.throughput,
        error_rate: c.error_rate
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
