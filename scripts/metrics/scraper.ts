/**
 * Metrics Scraper
 * Standalone utility to scrape Prometheus metrics from GraphRAG service
 */

const METRICS_URL = process.env.METRICS_URL || 'http://localhost:8002/metrics';

export interface ComponentMetrics {
  throughput: number; // queries per second
  error_rate: number; // percentage
  component: string;
}

export interface SystemMetrics {
  components: ComponentMetrics[];
  timestamp: string;
}

async function scrapeMetrics(): Promise<SystemMetrics> {
  try {
    const response = await fetch(METRICS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.status}`);
    }

    const text = await response.text();

    // Parse Prometheus text format
    // This is a simplified parser for demonstration
    // In a real scenario, we'd use a proper prometheus parser

    const components = ['retrieval', 'fusion', 'generation', 'policy'];
    const results: ComponentMetrics[] = components.map(comp => {
      const throughputMatch = text.match(new RegExp(`${comp}_total_count (\\d+)`));
      const errorMatch = text.match(new RegExp(`${comp}_error_count (\\d+)`));

      const total = throughputMatch ? parseInt(throughputMatch[1], 10) : 10; // Default mock values
      const errors = errorMatch ? parseInt(errorMatch[1], 10) : 0;

      return {
        component: comp,
        throughput: total / 60, // Mock QPS
        error_rate: total > 0 ? (errors / total) * 100 : 0
      };
    });

    return {
      components: results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Return mock data if scraper fails
    return {
      components: [
        { component: 'retrieval', throughput: 0, error_rate: 0 },
        { component: 'fusion', throughput: 0, error_rate: 0 },
        { component: 'generation', throughput: 0, error_rate: 0 },
        { component: 'policy', throughput: 0, error_rate: 0 }
      ],
      timestamp: new Date().toISOString(),
      // @ts-ignore
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// If run directly
if (process.argv[1] && (process.argv[1].endsWith('scraper.ts') || process.argv[1].endsWith('scraper.js'))) {
  scrapeMetrics().then(metrics => {
    console.log(JSON.stringify(metrics, null, 2));
  });
}

export { scrapeMetrics };
