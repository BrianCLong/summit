import express from 'express';
import client from 'prom-client';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 9092;
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
const API_URL = process.env.API_URL || 'http://api:4000';

// Initialize Registry
const register = new client.Registry();

// Define Gauges
const graphqlP95 = new client.Gauge({
  name: 'graphql_p95_ms',
  help: '95th percentile of GraphQL request duration in milliseconds',
});

const graphqlErrorRate = new client.Gauge({
  name: 'graphql_error_rate',
  help: 'Rate of GraphQL errors (errors / total requests)',
});

const smokeUptimePct = new client.Gauge({
  name: 'smoke_uptime_pct',
  help: 'Percentage of successful health probes in the last window',
});

register.registerMetric(graphqlP95);
register.registerMetric(graphqlErrorRate);
register.registerMetric(smokeUptimePct);

// Probing Logic
let probeHistory: boolean[] = [];
const WINDOW_SIZE = 10; // Keep last 10 probes

async function probeHealth() {
  try {
    const start = Date.now();
    await axios.get(`${API_URL}/health`);
    probeHistory.push(true);
  } catch (error) {
    console.error('Health probe failed:', error instanceof Error ? error.message : String(error));
    probeHistory.push(false);
  }

  if (probeHistory.length > WINDOW_SIZE) {
    probeHistory.shift();
  }

  const successCount = probeHistory.filter((r) => r).length;
  const uptime = probeHistory.length > 0 ? (successCount / probeHistory.length) * 100 : 100;
  smokeUptimePct.set(uptime);
}

async function updateMetrics() {
  try {
    // Probe local health
    await probeHealth();

    // Query Prometheus for P95 and Error Rate
    // P95: histogram_quantile(0.95, sum(rate(graphql_request_duration_seconds_bucket[5m])) by (le))
    const p95Query = 'histogram_quantile(0.95, sum(rate(graphql_request_duration_seconds_bucket[5m])) by (le))';
    const errorRateQuery = 'sum(rate(graphql_errors_total[5m])) / sum(rate(graphql_requests_total[5m]))';

    const [p95Res, errRes] = await Promise.all([
        axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: { query: p95Query } }),
        axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: { query: errorRateQuery } })
    ]);

    if (p95Res.data?.data?.result?.length > 0) {
        const val = parseFloat(p95Res.data.data.result[0].value[1]);
        if (!isNaN(val)) {
            graphqlP95.set(val * 1000); // Convert seconds to ms
        }
    }

    if (errRes.data?.data?.result?.length > 0) {
        const val = parseFloat(errRes.data.data.result[0].value[1]);
        if (!isNaN(val)) {
             graphqlErrorRate.set(val * 100); // Convert to percentage
        }
    }

  } catch (error) {
    console.error('Error updating SLO metrics:', error instanceof Error ? error.message : String(error));
  }
}

// Update metrics every 15 seconds
setInterval(updateMetrics, 15000);

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`SLO Exporter listening on port ${PORT}`);
});
