import express from 'express';

import { createExecuteRouter } from './routes/actions/execute.js';
import { createPreflightRouter } from './routes/actions/preflight.js';
import { createEpicsRouter } from './routes/epics/index.js';
import {
  GetReceiptDependencies,
  createGetReceiptRouter,
} from './routes/receipts/get.js';
import { PolicyDecisionStore } from './db/models/policy_decisions.js';
import { InMemoryPolicyDecisionStore } from './services/PolicyDecisionStore.js';
import { EventPublisher } from './services/EventPublisher.js';
import { EpicService } from './services/EpicService.js';
import { OpaPolicySimulationService, type PolicySimulationService } from './services/policyService.js';
import { ReviewQueueService } from './review/ReviewQueueService.js';
import { createReviewRouter } from './routes/review/index.js';
import {
  requireAuth,
  requireTenantIsolation,
  apiRateLimiter,
  privilegedRateLimiter,
  securityHeaders,
} from './middleware/security.js';
import { RBACManager } from '../../../packages/authentication/src/rbac/rbac-manager.js';
import { auditSink, IAuditSink } from '../../server/src/audit/sink.js';

export interface ApiDependencies extends Partial<GetReceiptDependencies> {
  decisionStore?: PolicyDecisionStore;
  preflightStore?: InMemoryPolicyDecisionStore;
  events?: EventPublisher;
  epicService?: EpicService;
  policyService?: PolicySimulationService;
  reviewQueue?: ReviewQueueService;
  rbacManager?: RBACManager;
  auditSink?: IAuditSink;
}

export function buildApp(dependencies: ApiDependencies = {}) {
  const app = express() as express.Application & { app?: express.Application };
  app.app = app;

  const rbacManager = dependencies.rbacManager ?? new RBACManager();
  const sink = dependencies.auditSink ?? auditSink;
  rbacManager.initializeDefaultRoles();
  rbacManager.defineRole({
    name: 'api_user',
    description: 'Default API consumer with read-only capabilities',
    permissions: [
      { resource: 'epics', action: 'read' },
      { resource: 'receipts', action: 'read' },
    ],
  });
  rbacManager.defineRole({
    name: 'epic_contributor',
    description: 'Can manage epic tasks',
    permissions: [
      { resource: 'epics', action: 'read' },
      { resource: 'epics', action: 'update' },
    ],
  });
  rbacManager.defineRole({
    name: 'review_moderator',
    description: 'Can review and decide',
    permissions: [
      { resource: 'review', action: 'read' },
      { resource: 'review', action: 'decide' },
    ],
  });
  rbacManager.defineRole({
    name: 'receipt_reader',
    description: 'Can fetch receipt details',
    permissions: [{ resource: 'receipts', action: 'read' }],
  });
  rbacManager.defineRole({
    name: 'action_operator',
    description: 'Can preflight and execute privileged actions',
    permissions: [
      { resource: 'actions:preflight', action: 'evaluate' },
      { resource: 'actions:execute', action: 'invoke' },
    ],
  });

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
  app.use(requireAuth(rbacManager));
  app.use(requireTenantIsolation());

  const epicService = dependencies.epicService ?? new EpicService();
  app.use('/epics', createEpicsRouter({ epicService, rbacManager }));

  const reviewQueue = dependencies.reviewQueue ?? new ReviewQueueService();
  app.use('/review', createReviewRouter({ queue: reviewQueue, rbacManager }));

  if (dependencies.store || dependencies.verifier) {
    app.use('/receipts', createGetReceiptRouter({
      ...(dependencies as GetReceiptDependencies),
      rbacManager,
    }));
  }

  // Privileged operations require tenant isolation and stricter rate limiting
  const decisionStore =
    dependencies.decisionStore ?? new PolicyDecisionStore(() => new Date());
  const policyService = dependencies.policyService ?? new OpaPolicySimulationService();
  app.use('/actions', privilegedRateLimiter, requireTenantIsolation(), createPreflightRouter({
    decisionStore,
    policyService,
    rbacManager,
  }));

  const preflightStore = dependencies.preflightStore ?? new InMemoryPolicyDecisionStore();
  const events = dependencies.events ?? new EventPublisher();
  app.use(
    '/actions',
    privilegedRateLimiter,
    requireTenantIsolation(),
    createExecuteRouter(preflightStore, events, policyService, rbacManager, sink),
  );

  return app;
}
