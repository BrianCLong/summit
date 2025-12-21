import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export function applyHttpSecurity(app, options = {}) {
  const corsOrigin = options.allowedOrigins ?? process.env.CORS_ORIGIN;
  const origins = Array.isArray(corsOrigin)
    ? corsOrigin
    : (corsOrigin ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(
    cors({
      origin: origins.length > 0 ? origins : undefined,
      credentials: true,
    }),
  );

  const maxRequests = Number(options.rateLimit ?? process.env.RATE_MAX ?? 600);
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: Number.isFinite(maxRequests) && maxRequests > 0 ? maxRequests : 600,
    }),
  );
}

export function csrfGuard(options = {}) {
  const token = options.token ?? process.env.CSRF_TOKEN;

  return function csrfMiddleware(req, res, next) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (!token) {
        return res.status(500).json({ error: 'csrf_token_missing' });
      }
      const headerToken = req.headers['x-csrf-token'];
      if (!headerToken || headerToken !== token) {
        return res.status(419).json({ error: 'csrf' });
      }
    }
    next();
  };
}

export function requestLogger() {
  return function requestLoggingMiddleware(req, res, next) {
    const started = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - started;
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          at: new Date(started).toISOString(),
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          ms: durationMs,
          reqId: req.headers['x-request-id'] ?? null,
        }),
      );
    });
    next();
  };
}
