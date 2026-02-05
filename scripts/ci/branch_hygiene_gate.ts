import { execSync } from 'node:child_process';

const MAX_AGE_DAYS = Number(process.env.BRANCH_HYGIENE_MAX_AGE_DAYS ?? 90);
const SCOPE = (process.env.BRANCH_HYGIENE_SCOPE ?? 'remote').toLowerCase();
const PROTECTED = (process.env.BRANCH_HYGIENE_PROTECTED ?? 'main,master,release/*,hotfix/*')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const GATE_CATALOG = 'docs/ga/GATE_FAILURE_CATALOG.md';

function run(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function matchesPattern(name: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    return name.startsWith(pattern.slice(0, -1));
  }
  return name === pattern;
}

function isProtected(name: string): boolean {
  return PROTECTED.some((pattern) => matchesPattern(name, pattern));
}

function listRefs(): string[] {
  const refs: string[] = [];
  if (SCOPE === 'remote' || SCOPE === 'all') {
    const output = run('git for-each-ref --format="%(refname:short)" refs/remotes/origin');
    output.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.endsWith('/HEAD')) {
        return;
      }
      refs.push(trimmed.replace(/^origin\//, ''));
    });
  }
  if (SCOPE === 'local' || SCOPE === 'all') {
    const output = run('git for-each-ref --format="%(refname:short)" refs/heads');
    output.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      refs.push(trimmed);
    });
  }
  return Array.from(new Set(refs)).sort();
}

function getLastCommitIso(ref: string): string {
  return run(`git log -1 --format=%cI ${ref}`);
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function main(): void {
  const refs = listRefs();
  if (refs.length === 0) {
    console.log('✅ Branch hygiene: no branches found for scope.');
    return;
  }

  const stale: { name: string; ageDays: number; lastCommit: string }[] = [];

  for (const ref of refs) {
    if (isProtected(ref)) {
      continue;
    }
    const lastCommit = getLastCommitIso(ref);
    const ageDays = daysSince(lastCommit);
    if (ageDays >= MAX_AGE_DAYS) {
      stale.push({ name: ref, ageDays, lastCommit });
    }
  }

  if (stale.length === 0) {
    console.log(`✅ Branch hygiene: no branches older than ${MAX_AGE_DAYS} days.`);
    return;
  }

  console.error('GATE FAILURE: GATE-BRANCH-HYGIENE');
  console.error(`Found ${stale.length} stale branch(es) older than ${MAX_AGE_DAYS} days.`);
  stale.forEach((entry) => {
    console.error(`- ${entry.name} (last commit ${entry.lastCommit}, ${entry.ageDays} days ago)`);
  });
  console.error('');
  console.error('Remediation:');
  console.error('- Delete or prune stale branches once work is merged or abandoned.');
  console.error('- If a branch is still active, rebase/merge to refresh its last commit timestamp.');
  console.error('- If a branch is part of a release train, add a protected pattern via BRANCH_HYGIENE_PROTECTED.');
  console.error('');
  console.error(`Reference: ${GATE_CATALOG}`);
  process.exit(1);
}

main();
