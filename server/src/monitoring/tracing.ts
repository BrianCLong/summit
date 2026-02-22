import { Request, Response, NextFunction } from 'express';
import { getTracer } from '../observability/tracer.js';
import { httpRequestsTotal, httpRequestDuration } from './metrics.js';
// import { logger } from '../utils/logger.js'; // logger is unused in current implementation

export const tracingService = {
  expressMiddleware: () => {
    return (req: Request, res: Response, next: NextFunction) => {
      const span = getTracer().getCurrentSpan();

      if (span && span.isRecording()) {
        const traceId = span.spanContext().traceId;
        res.setHeader('X-Trace-Id', traceId);
      }

      const start = process.hrtime();

      res.on('finish', () => {
        const duration = process.hrtime(start);
        const durationInSeconds = duration[0] + duration[1] / 1e9;

        const method = req.method;
        const route = req.route ? req.route.path : 'unknown';
        const statusCode = res.statusCode;

        // Increment total requests counter
        try {
          httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
        } catch (e) {
          // Ignore metric errors
        }

        // Observe duration
        try {
            httpRequestDuration.labels(method, route, statusCode.toString()).observe(durationInSeconds);
        } catch (e) {
            // Ignore metric errors
        }
      });

      next();
    };
  },
};

export default tracingService;
