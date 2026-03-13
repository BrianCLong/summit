/**
 * Metrics Scraper
 * Standalone utility to scrape Prometheus metrics from GraphRAG service
 */

const METRICS_URL = process.env.METRICS_URL || 'http://localhost:8002/metrics';

export interface ComponentMetrics {
  total_count: number;
  error_count: number;
  component: string;
}

export interface SystemMetrics {
  components: ComponentMetrics[];
  timestamp: string;
  error?: string;
}

/**
 * Scrapes Prometheus metrics and reports raw counters.
 */
export async function scrapeMetrics(): Promise<SystemMetrics> {
  const timestamp = new Date().toISOString();
  try {
    const response = await fetch(METRICS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.status}`);
    }

    const text = await response.text();

    const parseMetric = (name: string): number => {
      // Robust regex for Prometheus metrics including labels
      const regex = new RegExp(`^${name}(?:\\{.*?\\})?\\s+(\\d+(?:\\.\\d+)?)`, 'm');
      const match = text.match(regex);
      return match ? parseFloat(match[1]) : 0;
    };

    const components = ['retrieval', 'fusion', 'generation', 'policy'];
    const results: ComponentMetrics[] = components.map(comp => ({
      component: comp,
      total_count: parseMetric(`${comp}_total_count`),
      error_count: parseMetric(`${comp}_error_count`)
    }));

    return {
      components: results,
      timestamp
    };
  } catch (error) {
    return {
      components: [
        { component: 'retrieval', total_count: 0, error_count: 0 },
        { component: 'fusion', total_count: 0, error_count: 0 },
        { component: 'generation', total_count: 0, error_count: 0 },
        { component: 'policy', total_count: 0, error_count: 0 }
      ],
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// If run directly
const isMain = process.argv[1] && (process.argv[1].endsWith('scraper.ts') || process.argv[1].endsWith('scraper.js'));
if (isMain) {
  scrapeMetrics().then(metrics => {
    console.log(JSON.stringify(metrics, null, 2));
  });
}
