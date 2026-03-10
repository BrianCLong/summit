/**
 * /api/dashboard
 *
 * Aggregates branch/tag convergence data, artifact stats, and top findings.
 */
import { Router, Request, Response, type IRouter } from 'express';
import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { PATHS } from '../config.js';
import { getBranches, getTags } from '../utils/git.js';
import { incCounter, setGauge } from '../utils/metrics.js';

export const dashboardRouter: IRouter = Router();

type ArtifactStatus = 'superseded' | 'merged' | 'quarantined' | 'abandoned';

interface Finding {
  severity: 'error' | 'warning' | 'info';
  source: string;
  message: string;
}

async function loadArtifactStats(): Promise<{
  total: number;
  byStatus: Record<ArtifactStatus, number>;
  recentConcerns: string[];
}> {
  let files: string[];
  try { files = await readdir(PATHS.artifactsPr); } catch { return { total: 0, byStatus: {} as Record<ArtifactStatus, number>, recentConcerns: [] }; }

  const byStatus: Record<string, number> = {};
  const concerns: string[] = [];
  let total = 0;

  for (const file of files) {
    if (extname(file) !== '.json' || file === 'schema.json') continue;
    try {
      const raw = await readFile(join(PATHS.artifactsPr, file), 'utf-8');
      const data = JSON.parse(raw) as { status?: string; concern?: string };
      if (data.status) {
        byStatus[data.status] = (byStatus[data.status] ?? 0) + 1;
        total++;
      }
      if (data.concern) concerns.push(data.concern);
    } catch { /* skip */ }
  }

  return {
    total,
    byStatus: byStatus as Record<ArtifactStatus, number>,
    recentConcerns: [...new Set(concerns)].slice(0, 10),
  };
}

function buildFindings(
  branches: ReturnType<typeof getBranches>,
  artifactStats: { total: number; byStatus: Record<ArtifactStatus, number> },
): Finding[] {
  const findings: Finding[] = [];

  const quarantined = artifactStats.byStatus['quarantined'] ?? 0;
  if (quarantined > 0) {
    findings.push({ severity: 'error', source: 'artifacts', message: `${quarantined} artifact(s) in QUARANTINED state` });
  }

  const claudeBranches = branches.filter((b) => b.type === 'claude' && !b.remote);
  if (claudeBranches.length > 5) {
    findings.push({ severity: 'warning', source: 'git', message: `${claudeBranches.length} local claude/ branches open – consider merging or archiving` });
  }

  const total = branches.filter((b) => !b.remote).length;
  if (total > 20) {
    findings.push({ severity: 'warning', source: 'git', message: `${total} local branches found – high branch count may indicate stale work` });
  }

  if (findings.length === 0) {
    findings.push({ severity: 'info', source: 'dashboard', message: 'No critical findings – repo convergence looks healthy' });
  }

  return findings;
}

// GET /api/dashboard
dashboardRouter.get('/', async (_req: Request, res: Response) => {
  incCounter('summit_ui_dashboard_total', 'Dashboard requests');

  const [rawBranches, tags, artifactStats] = await Promise.all([
    Promise.resolve(getBranches()),
    Promise.resolve(getTags()),
    loadArtifactStats(),
  ]);

  // Deduplicate branches (remote + local may share names)
  const seen = new Set<string>();
  const branches = rawBranches.filter((b) => {
    const key = b.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const byType: Record<string, number> = {};
  for (const b of branches) { byType[b.type] = (byType[b.type] ?? 0) + 1; }

  const topFindings = buildFindings(rawBranches, artifactStats);

  // Update gauges for observability
  setGauge('summit_ui_branch_count', branches.length, 'Total unique branches');
  setGauge('summit_ui_tag_count', tags.length, 'Total git tags');
  setGauge('summit_ui_artifact_count', artifactStats.total, 'Total PR artifacts');

  res.json({
    branches: { total: branches.length, byType, list: branches.slice(0, 100) },
    tags: { total: tags.length, list: tags.slice(0, 50) },
    artifacts: artifactStats,
    topFindings,
    generatedAt: new Date().toISOString(),
  });
});
