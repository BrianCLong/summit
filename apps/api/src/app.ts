import express from 'express';

import { createExecuteRouter } from './routes/actions/execute.js';
import { createPreflightRouter } from './routes/actions/preflight.js';
import { createEpicsRouter } from './routes/epics/index.js';
import {
  GetReceiptDependencies,
  createGetReceiptRouter,
} from './routes/receipts/get.js';
import { PolicyDecisionStore } from './db/models/policy_decisions.js';
import { PolicyDecisionStore as InMemoryPolicyDecisionStore } from './services/PolicyDecisionStore.js';
import { EventPublisher } from './services/EventPublisher.js';
import { EpicService } from './services/EpicService.js';
import { OpaPolicySimulationService } from './services/policyService.js';
import { ReviewQueueService } from './review/ReviewQueueService.js';
import { createReviewRouter } from './routes/review/index.js';
import {
  requireAuth,
  requireTenantIsolation,
  apiRateLimiter,
  privilegedRateLimiter,
  securityHeaders,
} from './middleware/security.js';

export interface ApiDependencies extends Partial<GetReceiptDependencies> {
  decisionStore?: PolicyDecisionStore;
  preflightStore?: InMemoryPolicyDecisionStore;
  events?: EventPublisher;
  epicService?: EpicService;
  policyService?: OpaPolicySimulationService;
  reviewQueue?: ReviewQueueService;
}

export function buildApp(dependencies: ApiDependencies = {}) {
  const app = express() as express.Application & { app: express.Application };
  app.app = app;

  // Apply security headers to all routes
  app.use(securityHeaders());

  // Apply global rate limiting
  app.use(apiRateLimiter);

  app.use(express.json());

  // Health check endpoint (no auth required)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api' });
  });

  // All routes below require authentication
  app.use(requireAuth());

  const epicService = dependencies.epicService ?? new EpicService();
  app.use('/epics', createEpicsRouter({ epicService }));

  const reviewQueue = dependencies.reviewQueue ?? new ReviewQueueService();
  app.use('/review', createReviewRouter({ queue: reviewQueue }));

  if (dependencies.store || dependencies.verifier) {
    app.use('/receipts', createGetReceiptRouter(dependencies as GetReceiptDependencies));
  }

  // Privileged operations require tenant isolation and stricter rate limiting
  const decisionStore =
    dependencies.decisionStore ?? new PolicyDecisionStore(() => new Date());
  const policyService = dependencies.policyService ?? new OpaPolicySimulationService();
  app.use('/actions', privilegedRateLimiter, requireTenantIsolation(), createPreflightRouter({
    decisionStore,
    policyService,
  }));

  const preflightStore = dependencies.preflightStore ?? new InMemoryPolicyDecisionStore();
  const events = dependencies.events ?? new EventPublisher();
  app.use('/actions', privilegedRateLimiter, requireTenantIsolation(), createExecuteRouter(preflightStore, events, policyService));

  return app;
}
