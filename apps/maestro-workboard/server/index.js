import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.js';
import { capabilityProfiles, resolveCapabilityProfile } from './policy.js';
import { startRun } from './runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const dataDir = path.join(__dirname, '../data');
const app = express();

app.use(express.json());

const store = createStore({ dataDir });
await store.load();

app.get('/api/work-items', (req, res) => {
  res.json({ workItems: store.listWorkItems() });
});

app.post('/api/work-items', async (req, res) => {
  const item = await store.createWorkItem(req.body ?? {});
  res.status(201).json({ workItem: item });
});

app.patch('/api/work-items/:id', async (req, res) => {
  const item = await store.updateWorkItem(req.params.id, req.body ?? {});
  if (!item) {
    res.status(404).json({ error: 'Work item not found.' });
    return;
  }
  res.json({ workItem: item });
});

app.post('/api/work-items/:id/runs', async (req, res) => {
  const workItem = store.getWorkItem(req.params.id);
  if (!workItem) {
    res.status(404).json({ error: 'Work item not found.' });
    return;
  }
  const profile = resolveCapabilityProfile(req.body?.capabilityProfile);
  const run = await startRun({
    store,
    workItem,
    capabilityProfile: profile.id,
    worktreeMode: 'worktree',
  });
  res.status(201).json({ run });
});

app.get('/api/runs/:runId', (req, res) => {
  const run = store.getRun(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found.' });
    return;
  }
  res.json({ run });
});

app.get('/api/runs/:runId/events', (req, res) => {
  const events = store.listEvents(req.params.runId);
  res.json({ events });
});

app.get('/api/runs/:runId/events/stream', (req, res) => {
  const runId = req.params.runId;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const initial = store.listEvents(runId);
  initial.forEach(send);
  const unsubscribe = store.subscribe(runId, send);

  req.on('close', () => {
    unsubscribe();
    res.end();
  });
});

app.get('/api/capability-profiles', (req, res) => {
  res.json({ profiles: capabilityProfiles });
});

app.get('/api/work-items/:id/runs', (req, res) => {
  const runs = store.listRunsForWorkItem(req.params.id);
  res.json({ runs });
});

app.use('/artifacts', express.static(path.join(repoRoot, '.maestro-workboard')));
app.use(express.static(path.join(__dirname, '../public')));

const port = process.env.PORT || 4010;
app.listen(port, () => {
  console.log(`Maestro Workboard listening on ${port}`);
});
