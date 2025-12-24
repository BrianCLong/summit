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

export interface ApiDependencies extends Partial<GetReceiptDependencies> {
  decisionStore?: PolicyDecisionStore;
  preflightStore?: InMemoryPolicyDecisionStore;
  events?: EventPublisher;
  epicService?: EpicService;
  policyService?: OpaPolicySimulationService;
}

export function buildApp(dependencies: ApiDependencies = {}) {
  const app = express() as express.Application & { app: express.Application };
  app.app = app;
  app.use(express.json());

  const epicService = dependencies.epicService ?? new EpicService();
  app.use('/epics', createEpicsRouter({ epicService }));

  if (dependencies.store || dependencies.verifier) {
    app.use('/receipts', createGetReceiptRouter(dependencies as GetReceiptDependencies));
  }

  const decisionStore =
    dependencies.decisionStore ?? new PolicyDecisionStore(() => new Date());
  const policyService = dependencies.policyService ?? new OpaPolicySimulationService();
  app.use('/actions', createPreflightRouter({
    decisionStore,
    policyService,
  }));

  const preflightStore = dependencies.preflightStore ?? new InMemoryPolicyDecisionStore();
  const events = dependencies.events ?? new EventPublisher();
  app.use('/actions', createExecuteRouter(preflightStore, events));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api' });
  });

  return app;
}
