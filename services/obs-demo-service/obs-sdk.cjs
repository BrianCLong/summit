const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');

const contextStore = new AsyncLocalStorage();
const SERVICE_NAME = process.env.SERVICE_NAME || 'obs-demo-service';

const metricsRegistry = {
  requestTotals: {},
  errorTotals: {},
  retryTotals: 0,
  cacheHits: 0,
  latencyBuckets: [50, 100, 250, 500, 1000, 2500],
  latencyHistogram: {},
  queueDepths: {},
  saturationGauges: {},
};

function generateId(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

function now() {
  return new Date().toISOString();
}

function getContext() {
  return contextStore.getStore();
}

function withTelemetryContext(baseContext, fn) {
  const context = {
    trace_id: baseContext.trace_id || generateId(16),
    span_id: baseContext.span_id || generateId(8),
    request_id: baseContext.request_id || generateId(12),
    actor: baseContext.actor,
    customer_id: baseContext.customer_id,
    decision_id: baseContext.decision_id,
    build_sha: baseContext.build_sha || process.env.BUILD_SHA,
    route: baseContext.route,
    method: baseContext.method,
    service: baseContext.service || SERVICE_NAME,
  };

  return contextStore.run(context, fn);
}

function log(level, message, extra = {}) {
  const context = getContext() || {};
  const payload = {
    ts: now(),
    level,
    message,
    trace_id: context.trace_id,
    span_id: context.span_id,
    request_id: context.request_id,
    actor: context.actor,
    customer_id: context.customer_id,
    decision_id: context.decision_id,
    build_sha: context.build_sha,
    service: context.service || SERVICE_NAME,
    ...extra,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

function recordLatency(durationMs) {
  const bucket = metricsRegistry.latencyBuckets.find((upper) => durationMs <= upper) || 'inf';
  metricsRegistry.latencyHistogram[bucket] = (metricsRegistry.latencyHistogram[bucket] || 0) + 1;
}

function recordRequest(method, statusCode, durationMs) {
  const key = `${method}_${statusCode}`;
  metricsRegistry.requestTotals[key] = (metricsRegistry.requestTotals[key] || 0) + 1;
  recordLatency(durationMs);
  if (statusCode >= 500) {
    metricsRegistry.errorTotals[statusCode] = (metricsRegistry.errorTotals[statusCode] || 0) + 1;
  }
}

function recordRetry() {
  metricsRegistry.retryTotals += 1;
}

function recordCacheHit() {
  metricsRegistry.cacheHits += 1;
}

function setQueueDepth(name, value) {
  metricsRegistry.queueDepths[name] = value;
}

function setSaturation(name, value) {
  metricsRegistry.saturationGauges[name] = value;
}

function promLine(metric, labels, value, timestampMs = Date.now()) {
  const mergedLabels = { service: SERVICE_NAME, ...(labels || {}) };
  const labelStr = mergedLabels && Object.keys(mergedLabels).length
    ? `{${Object.entries(mergedLabels)
      .map(([key, val]) => `${key}="${val}"`)
      .join(',')}}`
    : '';
  return `${metric}${labelStr} ${value} ${Math.floor(timestampMs / 1000)}`;
}

function exportPrometheus() {
  const lines = [];
  Object.entries(metricsRegistry.requestTotals).forEach(([key, value]) => {
    const [method, code] = key.split('_');
    lines.push(promLine('http_requests_total', { method, code }, value));
  });
  Object.entries(metricsRegistry.errorTotals).forEach(([code, value]) => {
    lines.push(promLine('http_request_errors_total', { code }, value));
  });
  Object.entries(metricsRegistry.latencyHistogram).forEach(([bucket, value]) => {
    lines.push(promLine('http_request_duration_ms_bucket', { le: bucket }, value));
  });
  lines.push(promLine('http_request_duration_ms_sum', {}, Object.entries(metricsRegistry.latencyHistogram)
    .reduce((sum, [bucket, count]) => {
      const upper = bucket === 'inf' ? metricsRegistry.latencyBuckets[metricsRegistry.latencyBuckets.length - 1] : Number(bucket);
      return sum + upper * count;
    }, 0)));
  lines.push(promLine('http_request_duration_ms_count', {}, Object.values(metricsRegistry.latencyHistogram)
    .reduce((sum, count) => sum + count, 0)));

  lines.push(promLine('http_retries_total', {}, metricsRegistry.retryTotals));
  lines.push(promLine('cache_hits_total', {}, metricsRegistry.cacheHits));
  Object.entries(metricsRegistry.queueDepths).forEach(([queue, value]) => {
    lines.push(promLine('queue_depth', { queue }, value));
  });
  Object.entries(metricsRegistry.saturationGauges).forEach(([resource, value]) => {
    lines.push(promLine('resource_saturation_ratio', { resource }, value));
  });

  return lines.join('\n') + '\n';
}

function startSpan(name, attributes, fn) {
  const parent = getContext() || {};
  const spanContext = {
    ...parent,
    span_id: generateId(8),
    parent_span_id: parent.span_id,
  };
  const start = process.hrtime.bigint();
  return contextStore.run(spanContext, () => {
    log('info', 'span.start', { span: name, attributes });
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        return result
          .then((value) => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
            log('info', 'span.end', { span: name, duration_ms: durationMs });
            return value;
          })
          .catch((error) => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
            log('error', 'span.error', { span: name, duration_ms: durationMs, error: error.message });
            throw error;
          });
      }
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      log('info', 'span.end', { span: name, duration_ms: durationMs });
      return result;
    } catch (error) {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      log('error', 'span.error', { span: name, duration_ms: durationMs, error: error.message });
      throw error;
    }
  });
}

function httpMiddleware(handler) {
  return function middleware(req, res) {
    const traceId = req.headers['x-trace-id'] || generateId(16);
    const requestId = req.headers['x-request-id'] || generateId(12);
    const baseContext = {
      trace_id: traceId,
      span_id: generateId(8),
      request_id: requestId,
      actor: req.headers['x-actor-id'],
      customer_id: req.headers['x-customer-id'],
      decision_id: req.headers['x-decision-id'],
      build_sha: process.env.BUILD_SHA,
      route: req.url,
      method: req.method,
      service: req.headers['x-service-name'] || SERVICE_NAME,
    };

    const startedAt = process.hrtime.bigint();
    return withTelemetryContext(baseContext, () => {
      log('info', 'http.start', { method: req.method, path: req.url });
      res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        recordRequest(req.method, res.statusCode, durationMs);
        if (res.statusCode >= 500) {
          log('error', 'http.error', { status: res.statusCode, duration_ms: durationMs });
        }
        log('info', 'http.finish', { status: res.statusCode, duration_ms: durationMs });
      });
      return handler(req, res);
    });
  };
}

module.exports = {
  httpMiddleware,
  log,
  withTelemetryContext,
  startSpan,
  recordRetry,
  recordCacheHit,
  setQueueDepth,
  setSaturation,
  exportPrometheus,
  metricsRegistry,
};
