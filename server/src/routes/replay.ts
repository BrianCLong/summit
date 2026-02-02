// @ts-nocheck
import { Router, Response, NextFunction } from 'express';
// import { buildManifest } from '../replay/manifest.js';
// import { replayRun } from '../replay/runner.js';
// import { diffRuns } from '../replay/diff.js';

const buildManifest = async (id: string) => ({ id, error: 'Replay manifest service unavailable' });
const replayRun = async (id: string, opts: any) => ({ id, ok: false, error: 'Replay service unavailable' });
const diffRuns = async (a: string, b: string) => ({ a, b, equal: false, error: 'Diff service unavailable' });
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
  const d = await diffRuns(String(req.query.a), String(req.query.b));
  res.json(d);
});
export default r;
