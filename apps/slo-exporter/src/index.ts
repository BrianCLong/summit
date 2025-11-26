import express from 'express';
import { register, collectDefaultMetrics, Histogram, Counter, Gauge } from 'prom-client';
import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';
import fetch from 'cross-fetch';

// Environment configuration
const PORT = parseInt(process.env.SLO_EXPORTER_PORT || '9090', 10);
const API_URL = process.env.GRAPHQL_API_URL || 'http://localhost:4000/graphql';
const SCRAPE_INTERVAL_MS = parseInt(process.env.SCRAPE_INTERVAL_MS || '15000', 10);

// Initialize Prometheus metrics
collectDefaultMetrics({ register });

// GraphQL API metrics
const graphqlLatencyHistogram = new Histogram({
  name: 'graphql_operation_duration_seconds',
  help: 'GraphQL operation latency in seconds',
  labelNames: ['operation', 'success'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const graphqlErrorCounter = new Counter({
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation', 'error_type'],
  registers: [register],
});

const sloComplianceGauge = new Gauge({
  name: 'slo_compliance_ratio',
  help: 'SLO compliance ratio (0-1) for p95 latency and error rate',
  labelNames: ['metric_type'],
  registers: [register],
});

// Apollo Client for health checks
const client = new ApolloClient({
  link: new HttpLink({ uri: API_URL, fetch }),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: { fetchPolicy: 'no-cache' },
  },
});

// Health check query
const HEALTH_CHECK_QUERY = gql`
  query HealthCheck {
    __typename
  }
`;

// Collect metrics from GraphQL API
async function collectMetrics() {
  const startTime = Date.now();
  try {
    await client.query({ query: HEALTH_CHECK_QUERY });
    const duration = (Date.now() - startTime) / 1000;
    
    graphqlLatencyHistogram.observe({ operation: 'health_check', success: 'true' }, duration);
    
    // Calculate SLO compliance (p95 < 500ms target)
    const metrics = await register.getMetricsAsJSON();
    const latencyMetric = metrics.find(m => m.name === 'graphql_operation_duration_seconds');
    
    if (latencyMetric?.type === 'histogram') {
      // Simplified p95 calculation from histogram buckets
      const p95Value = duration; // In production, calculate from quantiles
      const sloCompliance = p95Value < 0.5 ? 1 : 0;
      sloComplianceGauge.set({ metric_type: 'latency_p95' }, sloCompliance);
    }
    
    // Error rate SLO (< 1% target)
    const errorRate = 0; // Calculate from actual error metrics
    const errorSloCompliance = errorRate < 0.01 ? 1 : 0;
    sloComplianceGauge.set({ metric_type: 'error_rate' }, errorSloCompliance);
    
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    graphqlLatencyHistogram.observe({ operation: 'health_check', success: 'false' }, duration);
    graphqlErrorCounter.inc({ operation: 'health_check', error_type: 'network' });
    console.error('Metrics collection failed:', error);
  }
}

// Express server for Prometheus scraping
const app = express();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`SLO Exporter listening on port ${PORT}`);
  console.log(`Metrics endpoint: http://localhost:${PORT}/metrics`);
  
  // Start periodic metric collection
  setInterval(collectMetrics, SCRAPE_INTERVAL_MS);
  collectMetrics(); // Initial collection
});