#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  buildReleaseNotesJson,
  buildReleaseNotesMarkdown,
  extractBreakingChanges,
  extractIssueReferences,
  groupPullRequests,
  loadPolicy,
  normalizePullRequest,
  selectHighlights,
  sortPullRequests,
} from './lib/assemble-release-notes.mjs';

type PullRequest = {
  number: number;
  title: string;
  url: string;
  mergedAt?: string;
  body?: string;
  labels: string[];
};

type Args = {
  tag?: string;
  targetSha?: string;
  previousTag?: string;
  trustSnapshot?: string;
  evidenceManifest?: string;
  evidenceBundle?: string;
  outputDir: string;
  policyPath: string;
  prData?: string;
  repo?: string;
  runId?: string;
  gaGateStatus?: string;
  dryRun: boolean;
};

function run(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function safeRun(cmd: string): string | null {
  try {
    return run(cmd);
  } catch {
    return null;
  }
}

function fail(message: string): never {
  console.error(`Release notes assembly failed: ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    outputDir: 'artifacts/release',
    policyPath: 'scripts/release/release-notes.policy.json',
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tag') args.tag = argv[++i];
    else if (arg === '--target-sha') args.targetSha = argv[++i];
    else if (arg === '--previous-tag') args.previousTag = argv[++i];
    else if (arg === '--trust-snapshot') args.trustSnapshot = argv[++i];
    else if (arg === '--evidence-manifest') args.evidenceManifest = argv[++i];
    else if (arg === '--evidence-bundle') args.evidenceBundle = argv[++i];
    else if (arg === '--output-dir') args.outputDir = argv[++i];
    else if (arg === '--policy') args.policyPath = argv[++i];
    else if (arg === '--pr-data') args.prData = argv[++i];
    else if (arg === '--repo') args.repo = argv[++i];
    else if (arg === '--run-id') args.runId = argv[++i];
    else if (arg === '--ga-gate-status') args.gaGateStatus = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`Assemble deterministic release notes.

Usage:
  pnpm exec tsx scripts/release/assemble_release_notes.ts --tag vX.Y.Z-rc.N [options]

Options:
  --tag <tag>                Release tag (required)
  --target-sha <sha>         Target commit SHA (default: HEAD)
  --previous-tag <tag>       Previous tag (default: git describe)
  --trust-snapshot <path>    Trust snapshot JSON (required)
  --evidence-manifest <path> Evidence manifest JSON (required)
  --evidence-bundle <path>   Evidence bundle file (required)
  --policy <path>            Release notes policy JSON
  --output-dir <dir>         Output directory
  --pr-data <path>           Use local PR JSON data instead of GitHub API
  --repo <owner/name>        GitHub repository (default: env)
  --run-id <id>              GitHub workflow run id
  --ga-gate-status <status>  GA gate status string
  --dry-run                  Print summary only
`);
}

function ensurePath(pathValue: string | undefined, label: string): string {
  if (!pathValue) {
    fail(`${label} is required.`);
  }
  if (!existsSync(pathValue)) {
    fail(`${label} not found: ${pathValue}`);
  }
  return pathValue;
}

function computeSha256(pathValue: string): string {
  const data = readFileSync(pathValue);
  return createHash('sha256').update(data).digest('hex');
}

function validateTrustSnapshot(snapshotPath: string): void {
  const schemaPath = resolve('trust', 'trust-snapshot.schema.json');
  if (!existsSync(schemaPath)) {
    fail(`Trust snapshot schema missing at ${schemaPath}`);
  }
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(snapshot);
  if (!valid) {
    const errors = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join('; ');
    fail(`Trust snapshot schema validation failed: ${errors}`);
  }
}

function validateEvidenceManifest(manifestPath: string): void {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const required = ['evidence_bundle', 'release_metadata'];
  for (const key of required) {
    if (!(key in manifest)) {
      fail(`Evidence manifest missing required key: ${key}`);
    }
  }
}

function getPreviousTag(targetSha: string): string | null {
  const candidate = safeRun(`git describe --tags --abbrev=0 ${targetSha}^`);
  return candidate || null;
}

function getRepoSlug(args: Args): string {
  const envRepo = process.env.GITHUB_REPOSITORY;
  return args.repo || envRepo || '';
}

function fetchPullRequests(args: Args, previousTag: string | null, targetSha: string): PullRequest[] {
  if (args.prData) {
    const raw = JSON.parse(readFileSync(args.prData, 'utf8'));
    return raw.map((pr: PullRequest) => normalizePullRequest(pr));
  }

  const repo = getRepoSlug(args);
  if (!repo) {
    fail('Repository slug is required (use --repo or GITHUB_REPOSITORY).');
  }

  const sinceDate = previousTag
    ? run(`git log -1 --format=%cI ${previousTag}`)
    : run(`git log --reverse --format=%cI ${targetSha} | head -n 1`);

  const ghQuery = `merged:>${sinceDate} base:main repo:${repo}`;
  const ghCmd = [
    'gh pr list',
    '--state merged',
    `--search "${ghQuery}"`,
    '--json number,title,labels,url,mergedAt,body,mergeCommit',
    '--limit 500',
  ].join(' ');

  const response = run(ghCmd);
  const parsed = JSON.parse(response);

  const commitRange = previousTag ? `${previousTag}..${targetSha}` : targetSha;
  const commits = new Set(
    run(`git rev-list ${commitRange}`)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean),
  );

  return parsed
    .map((pr: any) => ({
      ...pr,
      mergeCommit: pr.mergeCommit || pr.merge_commit,
    }))
    .filter((pr: any) => pr.mergeCommit && commits.has(pr.mergeCommit.oid))
    .map((pr: any) =>
      normalizePullRequest({
        number: pr.number,
        title: pr.title,
        url: pr.url,
        mergedAt: pr.mergedAt,
        body: pr.body,
        labels: pr.labels,
      }),
    );
}

function buildAssurance(
  trustSnapshotPath: string,
  gaGateStatus: string,
  schemaHash: string,
): Record<string, string> {
  const snapshot = JSON.parse(readFileSync(trustSnapshotPath, 'utf8'));
  const policyChecks = snapshot?.trust_signals?.policy_compliance?.policy_checks_passed_pct;
  const governanceVerdict =
    typeof policyChecks === 'number'
      ? policyChecks >= 100
        ? `PASS (${policyChecks}%)`
        : `WARN (${policyChecks}%)`
      : 'Deferred pending trust snapshot field';

  const sbomSummary = snapshot?.trust_signals?.sbom?.summary || 'Deferred pending trust snapshot field';
  const vulnerabilitySummary = snapshot?.trust_signals?.vulnerabilities?.summary || 'Deferred pending trust snapshot field';
  const reproducibleBuild = snapshot?.trust_signals?.reproducible_build?.status || 'Deferred pending trust snapshot field';
  const provenancePresence = snapshot?.trust_signals?.evidence_coverage?.coverage_pct
    ? `Evidence coverage ${snapshot.trust_signals.evidence_coverage.coverage_pct}%`
    : 'Deferred pending trust snapshot field';

  return {
    gaGateStatus,
    governanceVerdict,
    sbomSummary,
    vulnerabilitySummary,
    reproducibleBuild,
    provenancePresence,
    schemaHash,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.tag) {
    fail('Tag is required. Use --tag vX.Y.Z-rc.N');
  }

  const targetSha = args.targetSha || run('git rev-parse HEAD');
  const previousTag = args.previousTag || getPreviousTag(targetSha);

  const trustSnapshotPath = ensurePath(args.trustSnapshot, 'Trust snapshot');
  const evidenceManifestPath = ensurePath(args.evidenceManifest, 'Evidence manifest');
  const evidenceBundlePath = ensurePath(args.evidenceBundle, 'Evidence bundle');

  validateTrustSnapshot(trustSnapshotPath);
  validateEvidenceManifest(evidenceManifestPath);

  const policy = loadPolicy(args.policyPath);
  const rawPullRequests = fetchPullRequests(args, previousTag, targetSha);
  const pullRequests = sortPullRequests(rawPullRequests);

  const highlights = selectHighlights(pullRequests, policy);
  const sections = groupPullRequests(pullRequests, policy);
  const breakingChanges = extractBreakingChanges(pullRequests, policy);
  const issues = extractIssueReferences(pullRequests);

  const schemaPath = resolve('trust', 'trust-snapshot.schema.json');
  const schemaHash = existsSync(schemaPath) ? computeSha256(schemaPath) : 'Deferred pending schema file';

  const assurance = buildAssurance(
    trustSnapshotPath,
    args.gaGateStatus || 'Deferred pending GA gate status',
    schemaHash,
  );

  const evidence = {
    bundleFile: evidenceBundlePath,
    bundleDigest: computeSha256(evidenceBundlePath),
    manifestFile: evidenceManifestPath,
    manifestDigest: computeSha256(evidenceManifestPath),
    trustSnapshotFile: trustSnapshotPath,
    trustSnapshotDigest: computeSha256(trustSnapshotPath),
  };

  const metadata = {
    repo: getRepoSlug(args),
    run_id: args.runId || null,
  };

  const generatedAt = new Date().toISOString();

  const notesOptions = {
    tag: args.tag,
    generatedAt,
    targetSha,
    previousTag,
    highlights,
    sections,
    breakingChanges,
    assurance,
    evidence,
    issues,
    metadata,
  };

  const markdown = buildReleaseNotesMarkdown(notesOptions);
  const json = buildReleaseNotesJson(notesOptions);

  if (args.dryRun) {
    console.log(`Release notes dry run for ${args.tag}`);
    console.log(`Pull requests: ${pullRequests.length}`);
    console.log(`Breaking changes: ${breakingChanges.length}`);
    console.log(`Evidence bundle digest: ${evidence.bundleDigest}`);
    return;
  }

  const outDir = resolve(args.outputDir);
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, 'release_notes.md'), `${markdown}\n`);
  writeFileSync(join(outDir, 'release_notes.json'), `${JSON.stringify(json, null, 2)}\n`);
}

main();
