import express, { Request, Response } from 'express';
import { getTracer } from '../observability/tracer.js';

const router = express.Router();

/**
 * @openapi
 * /tracing/status:
 *   get:
 *     tags:
 *       - Monitoring
 *     summary: Get tracing status
 *     description: Returns the status of the distributed tracing system.
 *     responses:
 *       200:
 *         description: Tracing status
 */
router.get('/status', (req: Request, res: Response) => {
  const tracer = getTracer();
  const span = tracer.getCurrentSpan();

  res.json({
    enabled: true, // Assuming enabled if initialized
    initialized: tracer.isInitialized(),
    currentTraceId: span ? span.spanContext().traceId : null,
    currentSpanId: span ? span.spanContext().spanId : null,
    provider: 'OpenTelemetry',
    exporter: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ? 'OTLP' : (process.env.JAEGER_ENDPOINT ? 'Jaeger' : 'Console/None')
  });
});

export default router;
