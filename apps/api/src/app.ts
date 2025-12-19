import express from 'express';
import { createExecuteRouter } from './routes/actions/execute.js';
import {
  InMemoryPolicyDecisionStore,
  type PolicyDecisionStore,
} from './services/PolicyDecisionStore.js';
import { EventPublisher } from './services/EventPublisher.js';

export interface AppDependencies {
  store?: PolicyDecisionStore;
  events?: EventPublisher;
}

export const buildApp = (deps: AppDependencies = {}) => {
  const app = express();
  const store = deps.store ?? new InMemoryPolicyDecisionStore();
  const events = deps.events ?? new EventPublisher();

  app.use(express.json());
  app.use('/actions', createExecuteRouter(store, events));

  return { app, store, events };
};

// Allow running the service directly for manual testing
if (process.env.NODE_ENV !== 'test' && process.env.RUN_SERVER === 'true') {
  const { app } = buildApp();
  const port = process.env.PORT ? Number(process.env.PORT) : 4010;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on port ${port}`);
  });
}
