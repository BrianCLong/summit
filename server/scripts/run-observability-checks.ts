import { strict as assert } from 'node:assert';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { registry } from '../src/metrics.ts';
import { context, trace } from '@opentelemetry/api';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import {
  evaluateBurnRate,
  detectTelemetryAnomaly,
  defaultBurnRateThresholds,
  defaultTelemetryThresholds,
} from '../src/observability/alarm-simulator.ts';
import { features } from '../src/config/features.ts';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

async function verifyMetrics() {
  const metricNames = (await registry.getMetricsAsJSON()).map((metric) => metric.name);
  const expected = [
    'graph_query_latency_seconds',
    'ingest_pipeline_e2e_seconds',
    'ingest_signal_lag_seconds',
    'policy_decisions_total',
    'slo_error_budget_burn_rate',
  ];
  expected.forEach((metric) => {
    assert(metricNames.includes(metric), `Metric ${metric} not registered`);
  });
  console.log('✅ metrics registered:', expected.join(', '));
}

async function verifyTracing() {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  trace.setGlobalTracerProvider(provider);

  try {
    const tracer = provider.getTracer('observability.synthetic-check');
    const span = tracer.startSpan('observability.synthetic-check');
    await context.with(trace.setSpan(context.active(), span), async () => {
      span.setAttribute('check', 'synthetic');
      span.end();
    });

    await provider.forceFlush();

    const finished = exporter.getFinishedSpans();
    assert.equal(finished.length, 1, 'Synthetic span did not finish');
    console.log('✅ synthetic trace span executed');
  } finally {
    await provider.shutdown();
    trace.disable();
  }
}

function verifyAlerts() {
  const alertFile = path.resolve(__dirname, '../../observability/alert-rules.yml');
  const yamlContent = readFileSync(alertFile, 'utf8');
  const doc = load(yamlContent) as { groups: Array<{ rules?: Array<{ alert?: string; annotations?: Record<string, string> }> }> };
  const alerts = doc.groups.flatMap((group) => group.rules ?? []).filter((rule) => rule.alert);

  const requiredAlerts = ['TelemetryPoisonAnomaly', 'GraphQueryLatencyHotspot'];
  requiredAlerts.forEach((name) => {
    const rule = alerts.find((alert) => alert.alert === name);
    assert(rule, `Alert ${name} missing`);
    assert(rule?.annotations?.runbook_url?.startsWith('http'), `Alert ${name} missing runbook URL`);
  });
  console.log('✅ alert rules include telemetry + latency runbooks');
}

function verifyDashboards() {
  const dashboardFile = path.resolve(
    __dirname,
    '../../observability/grafana/dashboards/ga_core_dashboard.json',
  );
  const dashboard = JSON.parse(readFileSync(dashboardFile, 'utf8')) as {
    panels?: Array<{ title?: string }>;
    __inputs?: Array<{ name: string }>;
    links?: Array<{ url?: string }>;
  };
  const titles = new Set((dashboard.panels ?? []).map((panel) => panel.title));

  const requiredPanels = [
    'Graph query latency heatmap',
    'Ingest E2E p95',
    'Policy deny rate',
    'ER queue depth',
    'SLO burn down',
    'Telemetry anomalies',
  ];

  requiredPanels.forEach((panel) => {
    assert(titles.has(panel), `Grafana dashboard missing panel: ${panel}`);
  });

  assert(dashboard.__inputs?.some((input) => input.name === 'DS_PROM'), 'Dashboard missing Prometheus datasource input');
  assert(
    (dashboard.links ?? []).some((link) => link.url?.includes('/runbooks/ga-core')),
    'Dashboard missing runbook link',
  );

  console.log('✅ grafana dashboard ready for one-click import');
}

function verifyFeatureFlag() {
  assert(features.observability, 'Observability feature flag must default to enabled');
  console.log('✅ observability feature flag defaults to enabled');
}

function verifyAlarmSimulations() {
  const burnRate = evaluateBurnRate(6.5, defaultBurnRateThresholds);
  assert.equal(burnRate.severity, 'critical', 'Burn rate simulator failed to escalate critical severity');

  const telemetry = detectTelemetryAnomaly(
    { poisonEvents: 2, anomalyScore: 0.92 },
    defaultTelemetryThresholds,
  );
  assert(telemetry.triggered, 'Telemetry anomaly simulator should trigger for elevated poison events');
  assert.equal(telemetry.severity, 'critical', 'Telemetry anomaly severity should be critical');
  console.log('✅ alarm simulator validated for burn-rate and telemetry scenarios');
}

async function main() {
  console.log('Running observability checks...');
  await verifyMetrics();
  await verifyTracing();
  verifyAlerts();
  verifyDashboards();
  verifyFeatureFlag();
  verifyAlarmSimulations();
  console.log('All observability checks passed.');
}

main().catch((error) => {
  console.error('Observability checks failed:', error);
  process.exitCode = 1;
});
