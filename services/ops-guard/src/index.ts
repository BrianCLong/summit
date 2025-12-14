import express from 'express';
import { buildBudgetGuard } from './budgetGuard.js';
import { loadConfig } from './config.js';
import { evaluatePlan } from './costGovernor.js';
import { createLogger } from './logger.js';
import { renderMetrics } from './metrics.js';
import { ChaosRunner } from './chaosRunner.js';
import { QueryPlan } from './types.js';

const config = loadConfig();
const logger = createLogger();
const app = express();
const chaos = new ChaosRunner(config, logger);
chaos.start();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(await renderMetrics());
});

app.post('/guard/query', buildBudgetGuard(config, logger), (req, res) => {
  const plan = req.body as QueryPlan;
  res.json({
    status: 'accepted',
    durationMs: res.locals.durationMs,
    governance: res.locals.planGovernance,
    plan
  });
});

app.post('/governor/suggest', (req, res) => {
  const plan = req.body as QueryPlan;
  const governance = evaluatePlan(plan);
  res.json({ status: 'ok', governance });
});

app.post('/chaos/run', (_req, res) => {
  const run = chaos.run();
  res.json({ status: 'triggered', run });
});

app.get('/chaos/tasks', (_req, res) => {
  res.json({ followUps: chaos.getTasks() });
});

app.get('/chaos/slo-trend', (_req, res) => {
  res.json(chaos.sloTrend());
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ status: 'error', message: err.message });
});

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Ops Guard listening');
});
