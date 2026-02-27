#!/usr/bin/env -S npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

interface StatusContext {
  context?: string;
  state?: string;
  description?: string;
}

interface StatusCheckRollup {
  state?: string;
  contexts?: StatusContext[];
}

interface PRRow {
  number: number;
  title: string;
  updatedAt: string;
  labels?: Array<{ name: string }>;
  headRefName?: string;
  baseRefName?: string;
  statusCheckRollup?: StatusCheckRollup;
  mergeable?: string;
  mergeableState?: string;
  additions?: number;
  deletions?: number;
  files?: Array<{ path?: string; filename?: string }>;
}

type CIStatus = 'SUCCESS' | 'FAILURE' | 'PENDING' | 'MISSING';

interface PRData {
  number: number;
  title: string;
  labels: string[];
  updatedAt: string;
  headRefName: string;
  baseRefName: string;
  mergeableState: string;
  files: string[];
  filesChanged: number;
  additions: number;
  deletions: number;
  ci: {
    status: CIStatus;
    failingChecks: string[];
    details: string;
  };
  riskScore: number;
  factorBreakdown: string[];
  overlap: {
    count: number;
    overlappingPrs: number[];
  };
  recommendedAction: 'MERGE_NOW' | 'NEEDS_REVIEW' | 'NEEDS_REBASE' | 'NEEDS_FIX' | 'HOLD' | 'SPLIT';
}

interface MergeTrainItem {
  prNumber: number;
  riskScore: number;
  rationale: string;
}

interface Hotspot {
  path: string;
  overlapCount: number;
  prs: number[];
}

interface PRTriageReport {
  generatedAt: string;
  repo: string;
  mode: 'live' | 'snapshot';
  snapshotPath?: string;
  prs: PRData[];
  mergeTrain: MergeTrainItem[];
  hotspots: Hotspot[];
}

const OUTPUT_DIR = getArg('--out') ?? 'docs/ops/pr-triage';
const PR_TRIAGE_REPO = process.env.PR_TRIAGE_REPO || process.env.GITHUB_REPOSITORY || 'BrianCLong/summit';
const PR_TRIAGE_ALLOW_SNAPSHOT = process.env.PR_TRIAGE_ALLOW_SNAPSHOT !== '0';
const PR_TRIAGE_SNAPSHOT = process.env.PR_TRIAGE_SNAPSHOT || 'scripts/ops/snapshots/pr_list.json';
const GH_MAX_ATTEMPTS = Number.parseInt(process.env.PR_TRIAGE_MAX_ATTEMPTS || '3', 10);

const CRITICAL_PATHS = ['.github/', 'docs/governance/', 'docs/ga/', 'scripts/ci/', 'scripts/ga/', 'policy/', 'agent-contract.json'];

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function sleepMs(ms: number): void {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    // Intentional blocking delay to keep script dependency-free.
  }
}

function runGhJson(args: string[]): unknown {
  let lastError = 'unknown gh error';

  for (let attempt = 1; attempt <= GH_MAX_ATTEMPTS; attempt += 1) {
    const cmdArgs = [...args, '--json', 'number,title,updatedAt,labels,headRefName,baseRefName,statusCheckRollup,mergeable,mergeableState,additions,deletions,files'];
    const res = spawnSync('gh', cmdArgs, { encoding: 'utf-8' });
    if (res.status === 0 && res.stdout.trim()) {
      return JSON.parse(res.stdout);
    }

    lastError = (res.stderr || res.stdout || '').trim() || `gh exited ${res.status ?? 'unknown'}`;
    if (attempt < GH_MAX_ATTEMPTS) {
      const waitMs = 300 * 2 ** (attempt - 1);
      console.warn(`gh attempt ${attempt}/${GH_MAX_ATTEMPTS} failed, retrying in ${waitMs}ms: ${lastError}`);
      sleepMs(waitMs);
    }
  }

  throw new Error(lastError);
}

function readSnapshot(snapshotPath: string): PRRow[] {
  const raw = fs.readFileSync(snapshotPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Snapshot is not an array: ${snapshotPath}`);
  }
  return parsed as PRRow[];
}

function deriveCI(rollup?: StatusCheckRollup): { status: CIStatus; failingChecks: string[]; details: string } {
  if (!rollup) {
    return { status: 'MISSING', failingChecks: [], details: 'No statusCheckRollup data' };
  }

  const state = String(rollup.state || '').toUpperCase();
  const contexts = Array.isArray(rollup.contexts) ? rollup.contexts : [];
  const failingChecks = contexts
    .filter(c => String(c.state || '').toUpperCase() === 'FAILURE')
    .map(c => c.context || c.description || 'Unnamed failure');

  if (state === 'FAILURE' || failingChecks.length > 0) {
    return {
      status: 'FAILURE',
      failingChecks,
      details: failingChecks.length ? failingChecks.join(', ') : 'Failing status rollup'
    };
  }

  if (state === 'PENDING' || state === 'IN_PROGRESS' || state === 'QUEUED') {
    return { status: 'PENDING', failingChecks: [], details: 'Checks still running' };
  }

  if (state === 'SUCCESS') {
    return { status: 'SUCCESS', failingChecks: [], details: 'All reported checks passed' };
  }

  return { status: 'MISSING', failingChecks: [], details: `Unknown rollup state: ${rollup.state ?? 'none'}` };
}

function normalizePR(pr: PRRow): PRData {
  const files = Array.isArray(pr.files)
    ? pr.files
        .map(f => f.path || f.filename || '')
        .filter(Boolean)
    : [];

  return {
    number: pr.number,
    title: pr.title,
    labels: (pr.labels || []).map(l => l.name),
    updatedAt: pr.updatedAt,
    headRefName: pr.headRefName || 'unknown',
    baseRefName: pr.baseRefName || 'main',
    mergeableState: (pr.mergeableState || pr.mergeable || 'unknown').toLowerCase(),
    files,
    filesChanged: files.length,
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    ci: deriveCI(pr.statusCheckRollup),
    riskScore: 0,
    factorBreakdown: [],
    overlap: { count: 0, overlappingPrs: [] },
    recommendedAction: 'HOLD'
  };
}

function analyze(processedPrs: PRData[]): { hotspots: Hotspot[]; mergeTrain: MergeTrainItem[] } {
  const fileToPRs = new Map<string, number[]>();

  for (const pr of processedPrs) {
    for (const file of pr.files) {
      const prs = fileToPRs.get(file) || [];
      prs.push(pr.number);
      fileToPRs.set(file, prs);
    }
  }

  const hotspots: Hotspot[] = [];
  for (const [file, prs] of fileToPRs.entries()) {
    if (prs.length > 1) {
      hotspots.push({ path: file, overlapCount: prs.length, prs: [...new Set(prs)] });
    }
  }
  hotspots.sort((a, b) => b.overlapCount - a.overlapCount);

  for (const pr of processedPrs) {
    let score = 0;
    const factors: string[] = [];

    if (pr.ci.status === 'FAILURE') {
      score += 40;
      factors.push('CI failure (+40)');
    } else if (pr.ci.status === 'MISSING') {
      score += 20;
      factors.push('CI unknown (+20)');
    } else if (pr.ci.status === 'PENDING') {
      score += 10;
      factors.push('CI pending (+10)');
    }

    if (pr.mergeableState === 'dirty' || pr.mergeableState === 'conflicting') {
      score += 30;
      factors.push('Merge conflict (+30)');
    }

    const overlappingPrs = new Set<number>();
    for (const file of pr.files) {
      const peers = fileToPRs.get(file) || [];
      for (const peer of peers) {
        if (peer !== pr.number) overlappingPrs.add(peer);
      }
    }
    pr.overlap.count = overlappingPrs.size;
    pr.overlap.overlappingPrs = [...overlappingPrs].sort((a, b) => a - b);

    if (pr.overlap.count > 0) {
      const penalty = Math.min(30, pr.overlap.count * 10);
      score += penalty;
      factors.push(`Overlap with ${pr.overlap.count} PRs (+${penalty})`);
    }

    if (pr.files.some(f => CRITICAL_PATHS.some(cp => f.startsWith(cp)))) {
      score += 15;
      factors.push('Touches critical paths (+15)');
    }

    if (pr.filesChanged > 50) {
      score += 10;
      factors.push('Large file count (+10)');
    }

    const daysOld = (Date.now() - new Date(pr.updatedAt).getTime()) / (1000 * 3600 * 24);
    if (daysOld > 7) {
      score += 10;
      factors.push('Stale >7 days (+10)');
    }

    pr.riskScore = Math.min(100, score);
    pr.factorBreakdown = factors;

    if (pr.filesChanged > 120 || pr.additions + pr.deletions > 3000) {
      pr.recommendedAction = 'SPLIT';
    } else if (pr.riskScore >= 80) {
      pr.recommendedAction = 'HOLD';
    } else if (pr.mergeableState === 'dirty' || pr.mergeableState === 'conflicting') {
      pr.recommendedAction = 'NEEDS_REBASE';
    } else if (pr.ci.status === 'FAILURE') {
      pr.recommendedAction = 'NEEDS_FIX';
    } else if (pr.riskScore > 40) {
      pr.recommendedAction = 'NEEDS_REVIEW';
    } else {
      pr.recommendedAction = 'MERGE_NOW';
    }
  }

  const mergeTrain = processedPrs
    .filter(p => p.recommendedAction === 'MERGE_NOW' || p.recommendedAction === 'NEEDS_REVIEW')
    .sort((a, b) => a.riskScore - b.riskScore)
    .map(p => ({
      prNumber: p.number,
      riskScore: p.riskScore,
      rationale: p.factorBreakdown.length ? p.factorBreakdown.join(', ') : 'Low-risk candidate'
    }));

  return { hotspots: hotspots.slice(0, 20), mergeTrain };
}

function toMarkdown(report: PRTriageReport): string {
  const mergeRows = report.mergeTrain.length
    ? report.mergeTrain.map((m, i) => `| ${i + 1} | #${m.prNumber} | ${m.riskScore} | ${m.rationale} |`).join('\n')
    : '| - | - | - | No merge-now candidates |';

  const hotspotRows = report.hotspots.length
    ? report.hotspots.map(h => `| \`${h.path}\` | ${h.overlapCount} | ${h.prs.map(p => `#${p}`).join(', ')} |`).join('\n')
    : '| - | 0 | none |';

  const inventoryRows = report.prs
    .sort((a, b) => b.riskScore - a.riskScore)
    .map(pr => `| #${pr.number} | ${pr.recommendedAction} | ${pr.riskScore} | ${pr.ci.status} | ${pr.factorBreakdown.join('; ') || 'none'} |`)
    .join('\n');

  return `# PR Queue Stabilizer Report\n\n- Generated: ${report.generatedAt}\n- Repository: ${report.repo}\n- Mode: ${report.mode}\n${report.snapshotPath ? `- Snapshot: \`${report.snapshotPath}\`\n` : ''}- Open PRs analyzed: ${report.prs.length}\n\n## Recommended Merge Train\n| Order | PR | Risk | Rationale |\n|---|---|---|---|\n${mergeRows}\n\n## Conflict Hotspots\n| File | Overlap Count | PRs |\n|---|---|---|\n${hotspotRows}\n\n## Full Inventory\n| PR | Action | Risk | CI | Factors |\n|---|---|---|---|---|\n${inventoryRows || '| - | - | - | - | - |'}\n`;
}

function main(): void {
  let rawPrs: PRRow[] = [];
  let mode: 'live' | 'snapshot' = 'live';
  let snapshotPath: string | undefined;

  try {
    rawPrs = runGhJson(['pr', 'list', '--repo', PR_TRIAGE_REPO, '--state', 'open', '--limit', '100']) as PRRow[];
    console.log(`Fetched ${rawPrs.length} PRs from GitHub (${PR_TRIAGE_REPO}).`);
  } catch (err) {
    if (!PR_TRIAGE_ALLOW_SNAPSHOT) {
      throw err;
    }
    mode = 'snapshot';
    snapshotPath = PR_TRIAGE_SNAPSHOT;
    rawPrs = readSnapshot(snapshotPath);
    console.warn(`Using snapshot fallback: ${snapshotPath}`);
  }

  const processedPrs = rawPrs.map(normalizePR);
  const { hotspots, mergeTrain } = analyze(processedPrs);
  const report: PRTriageReport = {
    generatedAt: new Date().toISOString(),
    repo: PR_TRIAGE_REPO,
    mode,
    snapshotPath,
    prs: processedPrs,
    mergeTrain,
    hotspots
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'PR_TRIAGE_REPORT.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'PR_TRIAGE_REPORT.md'), toMarkdown(report));

  console.log(`Wrote ${OUTPUT_DIR}/PR_TRIAGE_REPORT.md`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
