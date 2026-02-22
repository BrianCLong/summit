// @ts-nocheck
import { Router, Response, NextFunction } from 'express';
import { buildManifest } from '../replay/manifest.js';
import { replayRun } from '../replay/runner.js';
import { diffRuns } from '../replay/diff.js';
import type { AuthenticatedRequest } from './types.js';
const r = Router();
r.post('/replay/:runId', async (req: AuthenticatedRequest, res: Response) => {
  const out = await replayRun(req.params.runId, { allowNet: false });
  res.json({ ok: true, out });
});
r.get('/replay/manifest/:runId', async (req: AuthenticatedRequest, res: Response) => {
  const m = await buildManifest(req.params.runId);
  res.json(m);
});
r.get('/replay/diff', async (req: AuthenticatedRequest, res: Response) => {
  const d = await diffRuns(String((req.query.a as any)), String((req.query.b as any)));
  res.json(d);
});
export default r;
