/**
 * /api/artifacts
 *
 * Reads .artifacts/pr/*.json files and exposes them with filtering/pagination.
 */
import { Router, Request, Response, type IRouter } from 'express';
import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { PATHS } from '../config.js';
import { incCounter } from '../utils/metrics.js';

export const artifactsRouter: IRouter = Router();

interface ArtifactEntry {
  pr: number;
  concern: string;
  patch_hash: string;
  status: string;
  timestamp: string;
  superseded_by?: number | string;
  message?: string;
  file: string;
}

async function loadArtifacts(): Promise<ArtifactEntry[]> {
  let files: string[];
  try {
    files = await readdir(PATHS.artifactsPr);
  } catch {
    return [];
  }

  const results: ArtifactEntry[] = [];
  for (const file of files) {
    if (extname(file) !== '.json' || file === 'schema.json') continue;
    try {
      const raw = await readFile(join(PATHS.artifactsPr, file), 'utf-8');
      const data = JSON.parse(raw) as Partial<ArtifactEntry>;
      if (typeof data.pr === 'number' && data.status && data.timestamp) {
        results.push({ ...data, file } as ArtifactEntry);
      }
    } catch {
      // skip malformed files
    }
  }

  // Sort newest first
  return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// GET /api/artifacts?page=1&pageSize=20&status=superseded
artifactsRouter.get('/', async (req: Request, res: Response) => {
  incCounter('summit_ui_artifact_list_total', 'Artifact list requests');
  const page     = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const status   = req.query.status ? String(req.query.status) : undefined;

  const all = await loadArtifacts();
  const filtered = status ? all.filter((a) => a.status === status) : all;
  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  res.json({ items, total, page, pageSize });
});

// GET /api/artifacts/summary – counts by status
artifactsRouter.get('/summary', async (_req: Request, res: Response) => {
  const all = await loadArtifacts();
  const byStatus: Record<string, number> = {};
  for (const a of all) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  }
  res.json({ total: all.length, byStatus });
});

// GET /api/artifacts/:pr – single artifact by PR number
artifactsRouter.get('/:pr', async (req: Request, res: Response) => {
  const prNum = Number(req.params.pr);
  if (isNaN(prNum)) { res.status(400).json({ error: 'Invalid PR number' }); return; }
  const all = await loadArtifacts();
  const found = all.filter((a) => a.pr === prNum);
  if (found.length === 0) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(found);
});
