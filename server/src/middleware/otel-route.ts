import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';
import type { Request, Response, NextFunction } from 'express';

export function otelRoute(spanName: string) {
  const tracer = trace.getTracer('maestro-mcp');
  return function (req: Request, res: Response, next: NextFunction) {
    const name =
      `${spanName} ${req.method} ${req.baseUrl || ''}${req.route?.path || ''}`.trim();
    const span: Span = tracer.startSpan(name);
    span.setAttribute('http.method', req.method);
    span.setAttribute(
      'http.route',
      (req.baseUrl || '') + (req.route?.path || req.path),
    );
    const user: any = (req as any).user || {};
    if (user?.id) span.setAttribute('user.id', String(user.id));
    // Try to capture runId in params when present
    if (req.params?.id) span.setAttribute('run.id', req.params.id);
    const endSpan = () => {
      span.setAttribute('http.status_code', res.statusCode);
      if (res.statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      res.removeListener('finish', endSpan);
      res.removeListener('close', endSpan);
    };
    res.on('finish', endSpan);
    res.on('close', endSpan);
    return context.with(trace.setSpan(context.active(), span), next);
  };
}
