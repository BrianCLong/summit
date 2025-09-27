import express from 'express';
import { z } from 'zod';
import { ExperimentStore } from './store.js';
import { buildExportBundle } from './exporter.js';

const app = express();
app.use(express.json());

const store = new ExperimentStore();

const metricSchema = z.object({
  name: z.string().min(1),
  baselineRate: z.number().min(0).max(1),
  minDetectableEffect: z.number()
});

const stopRuleSchema = z.object({
  maxDurationDays: z.number().int().positive(),
  maxUnits: z.number().int().positive().optional()
});

const analysisPlanSchema = z.object({
  method: z.literal('difference-in-proportions'),
  alpha: z.number().min(0).max(1),
  desiredPower: z.number().min(0).max(1)
});

const actorSchema = z.object({
  actor: z.string().min(1)
});

app.post('/experiments', (req, res) => {
  const schema = z
    .object({
      name: z.string().min(1),
      hypothesis: z.string().min(1),
      metrics: z.array(metricSchema).min(1),
      stopRule: stopRuleSchema,
      analysisPlan: analysisPlanSchema,
      actor: z.string().min(1)
    })
    .strict();
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  try {
    const { actor, ...rest } = parsed.data;
    const experiment = store.createExperiment(rest, actor);
    return res.status(201).json(experiment);
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message });
  }
});

app.get('/experiments/:id', (req, res) => {
  const experiment = store.getExperiment(req.params.id);
  if (!experiment) {
    return res.status(404).json({ message: 'Not found' });
  }
  return res.json(experiment);
});

app.post('/experiments/:id/start', (req, res) => {
  const parsed = actorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }
  try {
    const experiment = store.startExperiment(req.params.id, parsed.data.actor);
    return res.json(experiment);
  } catch (err) {
    return res.status(404).json({ message: (err as Error).message });
  }
});

app.put('/experiments/:id/hypothesis', (req, res) => {
  const schema = actorSchema.merge(z.object({ hypothesis: z.string().min(1) }));
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  try {
    store.attemptHypothesisUpdate(req.params.id, parsed.data.hypothesis, parsed.data.actor);
    return res.json(store.getExperiment(req.params.id));
  } catch (err) {
    return res.status(409).json({ message: (err as Error).message });
  }
});

app.post('/experiments/:id/export', (req, res) => {
  const parsed = actorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }
  try {
    const experiment = store.getExperiment(req.params.id);
    if (!experiment) {
      return res.status(404).json({ message: 'Not found' });
    }
    const bundle = buildExportBundle(experiment);
    store.recordExport(req.params.id, bundle);
    store.appendAudit(req.params.id, {
      actor: parsed.data.actor,
      action: 'EXPORT_PREREGISTRATION',
      detail: 'Generated preregistration bundle.',
      status: 'SUCCESS'
    });
    return res.json(bundle);
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message });
  }
});

app.get('/experiments/:id/audit', (req, res) => {
  const experiment = store.getExperiment(req.params.id);
  if (!experiment) {
    return res.status(404).json({ message: 'Not found' });
  }
  return res.json(experiment.auditLog);
});

app.post('/experiments/:id/results', (req, res) => {
  const schema = z
    .object({
      metric: z.string().min(1),
      variant: z.string().min(1),
      value: z.number(),
      actor: z.string().min(1)
    })
    .strict();
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }
  try {
    const experiment = store.addResult(
      req.params.id,
      parsed.data.metric,
      { variant: parsed.data.variant, value: parsed.data.value },
      parsed.data.actor
    );
    return res.json({ status: 'accepted', results: experiment.results[parsed.data.metric] });
  } catch (err) {
    return res.status(409).json({ message: (err as Error).message });
  }
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`PRER service listening on port ${port}`);
});
