import { Router } from 'express';
import { buildManifest } from '../replay/manifest';
import { replayRun } from '../replay/runner';
import { diffRuns } from '../replay/diff';
const r = Router();
r.post('/replay/:runId', async (req, res) => {
  const out = await replayRun(req.params.runId, { allowNet: false });
  res.json({ ok: true, out });
});
r.get('/replay/manifest/:runId', async (req, res) => {
  const m = await buildManifest(req.params.runId);
  res.json(m);
});
r.get('/replay/diff', async (req, res) => {
  const d = await diffRuns(String(req.query.a), String(req.query.b));
  res.json(d);
});
export default r;
