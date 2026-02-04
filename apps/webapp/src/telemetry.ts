import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';
import { tracer } from './tracing';
import { SpanStatusCode } from '@opentelemetry/api';

const API_BASE = '/api/monitoring';

function sendMetric(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(`${API_BASE}/web-vitals`, blob);
  } else {
    fetch(`${API_BASE}/web-vitals`, {
      body,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(e => console.error('Failed to send web vital', e));
  }
}

export function reportWebVitals() {
  onCLS(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
  onFCP(sendMetric);
  onTTFB(sendMetric);
}

export function trackGoldenPathStep(step: string, status: string = 'success') {
  const event = {
    event: 'golden_path_step',
    labels: {
      step,
      status,
      tenantId: 'unknown', // Could be enriched if we had user context here
    },
  };

  fetch(`${API_BASE}/telemetry/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch((err) => console.error('Failed to report telemetry', err));

  tracer.startActiveSpan('golden_path_step', (span) => {
    span.setAttribute('app.step', step);
    span.setAttribute('app.status', status);
    span.setStatus({ code: status === 'success' ? SpanStatusCode.OK : SpanStatusCode.ERROR });
    span.end();
  });
}

export function trackError(error: Error, component: string) {
  const event = {
    event: 'ui_error_boundary',
    labels: {
      component,
      message: error.message,
      stack: error.stack,
      tenantId: 'unknown',
    },
  };

  fetch(`${API_BASE}/telemetry/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch((err) => console.error('Failed to report error telemetry', err));

  tracer.startActiveSpan('ui_error_boundary', (span) => {
    span.setAttribute('app.component', component);
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.end();
  });
}
