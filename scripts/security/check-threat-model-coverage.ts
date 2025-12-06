#!/usr/bin/env node
/*
 * Advisory threat-model coverage checker.
 * Usage: node --loader ts-node/register scripts/security/check-threat-model-coverage.ts --base origin/main --head HEAD --json report.json
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface FeatureConfig {
  name: string;
  modelPath: string;
  owner: string;
  watchPaths: string[];
  description: string;
}

interface CoverageResult {
  feature: string;
  status: 'present' | 'missing';
  stale: boolean;
  lastUpdated?: string;
  owner: string;
  modelPath: string;
  touchedPaths: string[];
  maxAgeDays: number;
  notes?: string;
}

interface CoverageReport {
  baseRef: string;
  headRef: string;
  maxAgeDays: number;
  changedFiles: string[];
  touchedFeatures: string[];
  results: CoverageResult[];
}

const FEATURES: FeatureConfig[] = [
  {
    name: 'Authentication & Session Management',
    modelPath: path.join('docs', 'security', 'threat-models', 'auth.md'),
    owner: 'Identity & Access',
    description: 'User login, tokens, MFA, and session management.',
    watchPaths: [
      'services/authz-gateway',
      'server/src/auth',
      'server/src/authentication',
      'packages/auth',
      'docs/security/threat-models/auth.md',
    ],
  },
  {
    name: 'IntelGraph Multi-Tenant Queries',
    modelPath: path.join('docs', 'security', 'threat-models', 'intelgraph-queries.md'),
    owner: 'Graph Platform',
    description: 'Tenant-isolated graph querying, search, and exports.',
    watchPaths: [
      'ga-graphai/packages/knowledge-graph',
      'ga-graphai/packages/graphai',
      'ga-graphai/packages/query-copilot',
      'services/graph',
      'docs/security/threat-models/intelgraph-queries.md',
    ],
  },
  {
    name: 'Maestro Automation Runs',
    modelPath: path.join('docs', 'security', 'threat-models', 'maestro-runs.md'),
    owner: 'Automation & Orchestration',
    description: 'Workflow authoring, approvals, and execution.',
    watchPaths: [
      'ga-graphai/packages/maestro-conductor',
      'ga-graphai/packages/meta-orchestrator',
      'ga-graphai/packages/workflow-diff-engine',
      'ga-graphai/packages/workcell-runtime',
      'scripts/maestro',
      'docs/security/threat-models/maestro-runs.md',
    ],
  },
];

function parseArgs() {
  const args: Record<string, string> = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const current = raw[i];
    if (current.startsWith('--')) {
      const key = current.replace(/^--/, '');
      const next = raw[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

function getChangedFiles(baseRef: string, headRef: string): string[] {
  try {
    const output = execSync(`git diff --name-only ${baseRef}...${headRef}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.warn(`[threat-model] Failed to compute git diff: ${(error as Error).message}`);
    return [];
  }
}

function parseLastUpdated(filePath: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/last-updated:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    if (match) {
      return match[1];
    }
    const altMatch = content.match(/Last updated:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    return altMatch?.[1];
  } catch (err) {
    return undefined;
  }
}

function isStale(lastUpdated: string | undefined, maxAgeDays: number): boolean {
  if (!lastUpdated) return true;
  const updatedAt = new Date(lastUpdated);
  if (Number.isNaN(updatedAt.getTime())) return true;
  const ageMs = Date.now() - updatedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays > maxAgeDays;
}

function checkCoverage(baseRef: string, headRef: string, maxAgeDays: number): CoverageReport {
  const changedFiles = getChangedFiles(baseRef, headRef);

  const results: CoverageResult[] = [];
  const touchedFeatures: string[] = [];

  for (const feature of FEATURES) {
    const touchedPaths = changedFiles.filter((file) =>
      feature.watchPaths.some((watchPath) => file.startsWith(watchPath)),
    );

    if (!touchedPaths.length) continue;
    touchedFeatures.push(feature.name);

    const modelExists = fs.existsSync(feature.modelPath);
    const lastUpdated = modelExists ? parseLastUpdated(feature.modelPath) : undefined;
    const stale = !modelExists ? true : isStale(lastUpdated, maxAgeDays);

    results.push({
      feature: feature.name,
      owner: feature.owner,
      status: modelExists ? 'present' : 'missing',
      stale,
      lastUpdated,
      modelPath: feature.modelPath,
      touchedPaths,
      maxAgeDays,
      notes: feature.description,
    });
  }

  return {
    baseRef,
    headRef,
    maxAgeDays,
    changedFiles,
    touchedFeatures,
    results,
  };
}

function writeJsonReport(report: CoverageReport, jsonPath: string) {
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`[threat-model] Wrote report to ${jsonPath}`);
}

function renderSummary(report: CoverageReport): string {
  if (!report.touchedFeatures.length) {
    return 'This change does not touch monitored features; no threat model check required.';
  }

  const parts = report.results.map((result) => {
    const age = result.lastUpdated ? `last updated ${result.lastUpdated}` : 'no last-updated metadata';
    const freshness = result.status === 'missing' ? 'missing' : result.stale ? 'stale' : 'current';
    return `- ${result.feature}: ${result.status} (${freshness}; ${age}); owner: ${result.owner}; model: ${result.modelPath}`;
  });

  return parts.join('\n');
}

function appendStepSummary(report: CoverageReport) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const summary = renderSummary(report);
  fs.appendFileSync(
    summaryPath,
    `### Threat model coverage (advisory)\n\n${summary}\n\nChecked paths: ${
      report.changedFiles.length ? report.changedFiles.length : '0'
    } changed files against ${report.maxAgeDays}-day freshness window.\n`,
  );
}

function main() {
  const args = parseArgs();
  const baseRef = args.base ?? args['base-ref'] ?? process.env.BASE_REF ?? 'origin/main';
  const headRef = args.head ?? args['head-ref'] ?? process.env.HEAD_REF ?? 'HEAD';
  const maxAgeDays = Number(args['max-age'] ?? process.env.THREAT_MODEL_MAX_AGE_DAYS ?? 90);
  const jsonPath = args.json ?? args.output ?? args['output-file'];

  const report = checkCoverage(baseRef, headRef, maxAgeDays);

  const touchedLabel = report.touchedFeatures.length
    ? report.touchedFeatures.join(', ')
    : 'no monitored features';
  const headlineStatus = report.results.length
    ? report.results
        .map((r) => `${r.feature}: ${r.status}${r.stale ? ' (stale)' : ''}`)
        .join('; ')
    : 'not required';

  console.log(`This change touches ${touchedLabel}; threat model is ${headlineStatus}.`);
  console.log(renderSummary(report));

  if (jsonPath) {
    writeJsonReport(report, jsonPath);
  }

  appendStepSummary(report);
  process.exit(0); // advisory only in phase 1
}

main();
