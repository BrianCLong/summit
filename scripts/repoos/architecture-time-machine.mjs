#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { execFileSync } from 'child_process';
import {
  computeDriftTimeline,
  buildPrRootCause,
  buildSnapshotMetrics,
  buildTimelineHtml,
  computeEvolution,
  detectStructuralEvents,
  toPosixPath
} from './architecture-time-machine-core.mjs';

const repoPathArg = process.argv[2] ?? '.';
const repoPath = path.resolve(repoPathArg);
const sampleStep = Number.parseInt(process.env.ATM_SAMPLE_STEP ?? '25', 10);

async function main() {
  const gitDir = runGit(repoPath, ['rev-parse', '--git-dir']).trim();
  if (!gitDir) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }

  const outDir = path.join(repoPath, '.repoos/history');
  const evidenceDir = path.join(repoPath, '.repoos/evidence');
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(evidenceDir, { recursive: true });

  const commits = getCommitSeries(repoPath, sampleStep);
  const snapshots = [];
  const commitToPrMap = {};

  for (const commit of commits) {
    const date = runGit(repoPath, ['show', '-s', '--format=%cs', commit]).trim();
    const files = runGit(repoPath, ['ls-tree', '-r', '--name-only', commit])
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .sort();

    const packageJsonFiles = files.filter((f) => f.endsWith('package.json'));
    const packageMeta = [];
    for (const pkgPath of packageJsonFiles) {
      try {
        const raw = runGit(repoPath, ['show', `${commit}:${toPosixPath(pkgPath)}`]);
        const pkg = JSON.parse(raw);
        const deps = {
          ...(pkg.dependencies ?? {}),
          ...(pkg.devDependencies ?? {}),
          ...(pkg.peerDependencies ?? {})
        };
        packageMeta.push({
          module: pkgPath.replace(/\/package\.json$/, ''),
          name: pkg.name,
          dependencies: Object.keys(deps).sort()
        });
      } catch {
        // Intentionally constrained: malformed package data is skipped for deterministic progression.
      }
    }

    const message = runGit(repoPath, ['show', '-s', '--format=%s', commit]).trim();
    const prMatch = message.match(/\(#(\d+)\)/) ?? message.match(/Merge pull request #(\d+)/i);
    if (prMatch) {
      commitToPrMap[commit] = `#${prMatch[1]}`;
    }

    snapshots.push(buildSnapshotMetrics({ commit, date, files, packageMeta }));
  }

  const dependencyEvolution = computeEvolution(snapshots);
  const driftTimeline = computeDriftTimeline(snapshots);
  const architectureEvents = detectStructuralEvents(snapshots, dependencyEvolution, driftTimeline);
  const prRootCause = buildPrRootCause(architectureEvents, commitToPrMap);

  await writeJson(path.join(outDir, 'architecture-snapshots.json'), snapshots);
  await writeJson(path.join(outDir, 'dependency-evolution.json'), dependencyEvolution);
  await writeJson(path.join(outDir, 'drift-timeline.json'), driftTimeline);
  await writeJson(path.join(outDir, 'architecture-events.json'), architectureEvents);
  await writeJson(path.join(outDir, 'pr-root-cause.json'), prRootCause);

  const timelineHtml = buildTimelineHtml({
    driftTimeline,
    dependencyEvolution,
    events: architectureEvents
  });
  await fs.writeFile(path.join(outDir, 'architecture-timeline.html'), timelineHtml, 'utf8');

  const firstCouplingSpike = architectureEvents.find((event) => event.type === 'coupling-spike');
  const evidenceReport = {
    snapshotsAnalyzed: snapshots.length,
    structuralEvents: architectureEvents.length,
    firstCouplingSpike: firstCouplingSpike?.commit ?? null,
    driftPeak: driftTimeline.reduce(
      (best, point) => (point.driftScore > best.driftScore ? point : best),
      driftTimeline[0] ?? { commit: null, driftScore: 0 }
    ),
    deterministic: true
  };
  await writeJson(path.join(evidenceDir, 'architecture-time-machine-report.json'), evidenceReport);

  console.log('Architecture Time Machine Report');
  console.log('--------------------------------');
  console.log(`Snapshots Analyzed: ${snapshots.length}`);
  console.log(`Major Structural Events: ${architectureEvents.length}`);
  console.log(`First Coupling Spike: ${firstCouplingSpike?.commit ?? 'none'}`);
}

function getCommitSeries(repoPath, step) {
  const commits = runGit(repoPath, ['rev-list', '--reverse', 'HEAD'])
    .split('\n')
    .filter(Boolean);
  if (commits.length === 0) return [];

  const sampled = [];
  for (let i = 0; i < commits.length; i += step) {
    sampled.push(commits[i]);
  }
  if (sampled[sampled.length - 1] !== commits[commits.length - 1]) {
    sampled.push(commits[commits.length - 1]);
  }
  return sampled;
}

function runGit(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 });
}

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  console.error('Architecture Time Machine failed:', error.message);
  process.exitCode = 1;
});
