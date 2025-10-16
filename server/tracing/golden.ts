import { context, trace, SpanKind, propagation } from '@opentelemetry/api';
export async function goldenSearch(req, res, next) {
  const tracer = trace.getTracer('web');
  const span = tracer.startSpan('golden.search', {
    kind: SpanKind.SERVER,
    attributes: {
      'app.tenant': req.headers['x-tenant-id'] || 'unknown',
      'app.user': req.user?.id || 'anon',
    },
  });
  return await context.with(trace.setSpan(context.active(), span), async () => {
    res.on('finish', () => span.end());
    next();
  });
}
