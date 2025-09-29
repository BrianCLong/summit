import fetch from 'node-fetch';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

interface MetricData {
  value: [number, string];
  metric: Record<string, string>;
}

interface QueryResult {
  resultType: string;
  result: MetricData[];
}

interface PrometheusResponse {
  status: string;
  data: QueryResult;
}

export const metricsCache: Record<string, any> = {};

async function queryPrometheus(query: string): Promise<QueryResult | undefined> {
  try {
    const response = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      console.error(`Failed to query Prometheus: ${response.statusText}`);
      return undefined;
    }
    const data = await response.json() as PrometheusResponse;
    if (data.status === 'success') {
      return data.data;
    }
    console.error(`Prometheus query failed: ${data.status}`);
    return undefined;
  } catch (error) {
    console.error(`Error fetching from Prometheus: ${error}`);
    return undefined;
  }
}

export async function fetchAndCacheMetrics() {
  console.log('Fetching Prometheus metrics...');

  // Fetch p95 latency
  const p95Query = 'histogram_quantile(0.95, sum(rate(symphony_route_execute_latency_ms_bucket[5m])) by (le, model))';
  const p95Result = await queryPrometheus(p95Query);
  if (p95Result) {
    p95Result.result.forEach(item => {
      const model = item.metric.model || 'unknown';
      metricsCache[`p95_latency_${model}`] = parseFloat(item.value[1]);
    });
  }

  // Fetch error rate
  const errorRateQuery = 'sum(rate(symphony_errors_total[5m])) / sum(rate(symphony_route_execute_latency_ms_count[5m]))';
  const errorRateResult = await queryPrometheus(errorRateQuery);
  if (errorRateResult && errorRateResult.result.length > 0) {
    metricsCache.error_rate = parseFloat(errorRateResult.result[0].value[1]);
  }

  // Fetch budget fraction
  const budgetFractionQuery = 'symphony_budget_fraction_used';
  const budgetFractionResult = await queryPrometheus(budgetFractionQuery);
  if (budgetFractionResult) {
    budgetFractionResult.result.forEach(item => {
      const model = item.metric.model || 'unknown';
      metricsCache[`budget_fraction_${model}`] = parseFloat(item.value[1]);
    });
  }

  console.log('Prometheus metrics fetched and cached.', metricsCache);
}

// Initial fetch and set up interval
// fetchAndCacheMetrics();
// setInterval(fetchAndCacheMetrics, 60 * 1000); // Every 1 minute
