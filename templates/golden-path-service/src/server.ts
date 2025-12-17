import express from 'express';
import helmet from 'helmet';
import { loggingMiddleware } from './middleware/logging.js';
import { bindRequestContext } from './middleware/request-context.js';
import { healthRouter } from './routes/health.js';
import { metricsRouter } from './routes/metrics.js';
import { buildSecureRouter } from './routes/secure.js';
import { httpRequestDuration, httpRequestErrors, httpRequestTotal } from './observability/metrics.js';
import { checkAccess, PolicyEvaluator } from './policy-client.js';
import { config } from './config.js';

export type ServerOptions = {
  policyEvaluator?: PolicyEvaluator;
  metricsEnabled?: boolean;
  secureApprovalEnabled?: boolean;
};

export const createServer = (options: ServerOptions = {}) => {
  const app = express();
  const policyEvaluator = options.policyEvaluator ?? checkAccess;
  const metricsEnabled = options.metricsEnabled ?? config.metricsEnabled;
  const secureApprovalEnabled = options.secureApprovalEnabled ?? config.featureFlagSecureApproval;

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json());
  app.use(bindRequestContext);
  app.use(loggingMiddleware);

  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
    res.on('finish', () => {
      const labels = { method: req.method, route: req.route?.path || req.path, status: res.statusCode };
      httpRequestTotal.inc(labels);
      if (res.statusCode >= 400) {
        httpRequestErrors.inc(labels);
      }
      end({ status: res.statusCode });
    });
    next();
  });

  app.use(healthRouter);
  if (metricsEnabled) {
    app.use(metricsRouter);
  } else {
    app.get('/metrics', (_req, res) => res.status(404).json({ message: 'metrics-disabled' }));
  }

  if (secureApprovalEnabled) {
    app.use(buildSecureRouter(policyEvaluator));
  }

  app.get('/hello', (_req, res) => {
    res.json({ message: 'hello, world' });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ message: 'internal_error', detail: err.message });
  });

  return app;
};
