import express from 'express';
import client from 'prom-client';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 9099;
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

// Registry
const register = new client.Registry();

// Metrics
const p95Gauge = new client.Gauge({
  name: 'summit_graphql_p95_latency_seconds',
  help: 'p95 Latency of GraphQL requests (calculated from Prometheus)',
  registers: [register],
});

const errorRateGauge = new client.Gauge({
  name: 'summit_graphql_error_rate',
  help: 'Error rate of GraphQL requests (calculated from Prometheus)',
  registers: [register],
});

// Update logic
async function updateMetrics() {
  try {
    // p95 Query
    // histogram_quantile(0.95, sum(rate(graphql_request_duration_seconds_bucket[5m])) by (le))
    const p95Query = 'histogram_quantile(0.95, sum(rate(graphql_request_duration_seconds_bucket[5m])) by (le))';
    const p95Res = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: { query: p95Query } });

    if (p95Res.data.status === 'success' && p95Res.data.data.result.length > 0) {
      const value = parseFloat(p95Res.data.data.result[0].value[1]);
      if (!isNaN(value)) {
        p95Gauge.set(value);
      }
    }

    // Error Rate Query
    // sum(rate(graphql_errors_total[5m])) / sum(rate(graphql_requests_total[5m]))
    // Handle case where requests total is 0 to avoid NaN/Infinity
    const errorRateQuery = 'sum(rate(graphql_errors_total[5m])) / (sum(rate(graphql_requests_total[5m])) > 0 or vector(1))';
    // Simplified: just get errors and total separately
    const errorsQuery = 'sum(rate(graphql_errors_total[5m]))';
    const totalQuery = 'sum(rate(graphql_requests_total[5m]))';

    const [errorsRes, totalRes] = await Promise.all([
        axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: { query: errorsQuery } }),
        axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: { query: totalQuery } })
    ]);

    let errors = 0;
    let total = 0;

    if (errorsRes.data.status === 'success' && errorsRes.data.data.result.length > 0) {
        errors = parseFloat(errorsRes.data.data.result[0].value[1]);
    }
    if (totalRes.data.status === 'success' && totalRes.data.data.result.length > 0) {
        total = parseFloat(totalRes.data.data.result[0].value[1]);
    }

    if (total > 0) {
        errorRateGauge.set(errors / total);
    } else {
        errorRateGauge.set(0);
    }

    const p95Metric = await p95Gauge.get();
    const errorRateMetric = await errorRateGauge.get();
    console.log(`Updated SLO metrics: p95=${p95Metric.values[0]?.value}, errorRate=${errorRateMetric.values[0]?.value}`);

  } catch (error: any) {
    console.error('Error updating SLO metrics:', error.message);
  }
}

// Update every 15 seconds
setInterval(updateMetrics, 15000);
updateMetrics(); // Initial update

// Expose metrics
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`SLO Exporter listening on port ${PORT}`);
});
