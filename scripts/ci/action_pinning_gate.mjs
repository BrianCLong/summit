#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_WORKFLOWS_DIR = path.join(process.cwd(), '.github', 'workflows');
const DEFAULT_OUT_FILE = path.join(
  process.cwd(),
  'artifacts',
  'ci-sbom',
  'actions-inventory.json'
);

function parseArgs(argv) {
  const out = {
    workflowsDir: DEFAULT_WORKFLOWS_DIR,
    outFile: DEFAULT_OUT_FILE,
    help: false
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--workflows-dir') {
      out.workflowsDir = argv[i + 1] ?? out.workflowsDir;
      i += 1;
      continue;
    }
    if (arg === '--out') {
      out.outFile = argv[i + 1] ?? out.outFile;
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function indentOf(line) {
  let i = 0;
  while (i < line.length && line[i] === ' ') {
    i += 1;
  }
  return i;
}

function stripInlineComment(rawLine) {
  const trimmed = rawLine.trimStart();
  if (trimmed.startsWith('#')) {
    return '';
  }
  const hashIndex = rawLine.indexOf(' #');
  if (hashIndex >= 0) {
    return rawLine.slice(0, hashIndex);
  }
  const tabHashIndex = rawLine.indexOf('\t#');
  if (tabHashIndex >= 0) {
    return rawLine.slice(0, tabHashIndex);
  }
  return rawLine;
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isFullSha(ref) {
  return /^[0-9a-f]{40}$/i.test(ref);
}

function isDockerDigest(usesValue) {
  return /^docker:\/\/.+@sha256:[0-9a-f]{64}$/i.test(usesValue);
}

function classifyUses(usesValue) {
  const value = usesValue.trim();

  if (value.startsWith('./')) {
    return {
      kind: 'local',
      source: value,
      owner: null,
      repo: null,
      ref: null,
      path: null,
      firstParty: true,
      thirdParty: false
    };
  }

  if (value.startsWith('docker://')) {
    return {
      kind: 'docker',
      source: value,
      owner: null,
      repo: null,
      ref: null,
      path: null,
      firstParty: false,
      thirdParty: false
    };
  }

  const atIndex = value.lastIndexOf('@');
  if (atIndex <= 0) {
    return {
      kind: 'unknown',
      source: value,
      owner: null,
      repo: null,
      ref: null,
      path: null,
      firstParty: false,
      thirdParty: false
    };
  }

  const left = value.slice(0, atIndex);
  const ref = value.slice(atIndex + 1);

  if (ref.includes('${{') || left.includes('${{')) {
    return {
      kind: 'dynamic',
      source: value,
      owner: null,
      repo: null,
      ref,
      path: null,
      firstParty: false,
      thirdParty: false
    };
  }

  const parts = left.split('/');
  if (parts.length < 2) {
    return {
      kind: 'unknown',
      source: value,
      owner: null,
      repo: null,
      ref,
      path: null,
      firstParty: false,
      thirdParty: false
    };
  }

  const owner = parts[0];
  const repo = parts[1];
  const actionPath = parts.length > 2 ? parts.slice(2).join('/') : null;
  const firstParty = owner === 'actions' || owner === 'github';
  return {
    kind: 'action',
    source: value,
    owner,
    repo,
    ref,
    path: actionPath,
    firstParty,
    thirdParty: !firstParty
  };
}

export function scanWorkflowText(text, fileRelPath) {
  const lines = text.split(/\r?\n/);

  let workflowName = null;
  let inJobs = false;
  let jobsIndent = null;
  let currentJobId = null;
  let currentJobName = null;
  let jobIndent = null;
  let inSteps = false;
  let stepsIndent = null;
  let currentStepIndex = -1;
  let currentStepName = null;
  let currentStepIndent = null;

  const found = [];

  function pushFound(kind, usesValue, lineNo) {
    const classification = classifyUses(usesValue);
    found.push({
      workflowFile: fileRelPath,
      workflowName: workflowName ?? null,
      jobId: currentJobId ?? null,
      jobName: currentJobName ?? null,
      stepIndex: kind === 'step' ? currentStepIndex : null,
      stepName:
        kind === 'step'
          ? currentStepName ?? `step-${currentStepIndex}`
          : null,
      kind,
      uses: classification.source,
      owner: classification.owner,
      repo: classification.repo,
      actionPath: classification.path,
      ref: classification.ref,
      isPinned:
        classification.kind === 'local'
          ? true
          : classification.kind === 'docker'
            ? isDockerDigest(classification.source)
            : classification.kind === 'action'
              ? isFullSha(classification.ref)
              : false,
      pinType:
        classification.kind === 'local'
          ? 'local'
          : classification.kind === 'docker'
            ? isDockerDigest(classification.source)
              ? 'docker-digest'
              : 'docker-unpinned'
            : classification.kind === 'action'
              ? isFullSha(classification.ref)
                ? 'commit-sha'
                : 'floating-ref'
              : classification.kind === 'dynamic'
                ? 'dynamic'
                : 'unknown',
      firstParty: classification.firstParty,
      thirdParty: classification.thirdParty,
      line: lineNo
    });
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const stripped = stripInlineComment(raw);
    if (!stripped.trim()) {
      continue;
    }

    const indent = indentOf(stripped);
    const trimmed = stripped.trim();

    if (indent === 0 && trimmed.startsWith('name:')) {
      workflowName = unquote(trimmed.slice('name:'.length).trim());
      continue;
    }

    if (indent === 0 && trimmed === 'jobs:') {
      inJobs = true;
      jobsIndent = 0;
      currentJobId = null;
      currentJobName = null;
      jobIndent = null;
      inSteps = false;
      stepsIndent = null;
      continue;
    }

    if (
      inJobs &&
      indent <= (jobsIndent ?? 0) &&
      indent === 0 &&
      trimmed !== 'jobs:'
    ) {
      inJobs = false;
      jobsIndent = null;
      currentJobId = null;
      currentJobName = null;
      jobIndent = null;
      inSteps = false;
      stepsIndent = null;
      continue;
    }

    if (
      inJobs &&
      jobsIndent === 0 &&
      indent === 2 &&
      /^[A-Za-z0-9_-]+:\s*$/.test(trimmed)
    ) {
      currentJobId = trimmed.slice(0, -1);
      currentJobName = null;
      jobIndent = indent;
      inSteps = false;
      stepsIndent = null;
      currentStepIndex = -1;
      currentStepName = null;
      currentStepIndent = null;
      continue;
    }

    if (
      currentJobId &&
      jobIndent != null &&
      indent === jobIndent + 2 &&
      trimmed.startsWith('name:')
    ) {
      currentJobName = unquote(trimmed.slice('name:'.length).trim());
      continue;
    }

    if (currentJobId && jobIndent != null && indent === jobIndent + 2) {
      if (trimmed.startsWith('uses:')) {
        const usesValue = unquote(trimmed.slice('uses:'.length).trim());
        pushFound('job', usesValue, i + 1);
        continue;
      }
    }

    if (
      currentJobId &&
      trimmed === 'steps:' &&
      jobIndent != null &&
      indent >= jobIndent + 2
    ) {
      inSteps = true;
      stepsIndent = indent;
      currentStepIndex = -1;
      currentStepName = null;
      currentStepIndent = null;
      continue;
    }

    if (inSteps && stepsIndent != null && indent <= stepsIndent) {
      if (trimmed !== 'steps:') {
        inSteps = false;
        stepsIndent = null;
        currentStepIndex = -1;
        currentStepName = null;
        currentStepIndent = null;
      }
    }

    if (inSteps && stepsIndent != null && indent > stepsIndent) {
      if (trimmed.startsWith('-')) {
        currentStepIndex += 1;
        currentStepName = null;
        currentStepIndent = indent;

        const afterDash = trimmed.slice(1).trimStart();
        if (afterDash.startsWith('name:')) {
          currentStepName = unquote(afterDash.slice('name:'.length).trim());
          continue;
        }
        if (afterDash.startsWith('uses:')) {
          const usesValue = unquote(afterDash.slice('uses:'.length).trim());
          pushFound('step', usesValue, i + 1);
          continue;
        }
        continue;
      }
    }

    if (inSteps && currentStepIndent != null && indent > currentStepIndent) {
      if (trimmed.startsWith('name:') && currentStepName == null) {
        currentStepName = unquote(trimmed.slice('name:'.length).trim());
        continue;
      }
      if (trimmed.startsWith('uses:')) {
        const usesValue = unquote(trimmed.slice('uses:'.length).trim());
        pushFound('step', usesValue, i + 1);
      }
    }
  }

  return found;
}

function sortInventoryEntries(entries) {
  return [...entries].sort((a, b) => {
    const keyA = [
      a.workflowFile ?? '',
      a.jobId ?? '',
      a.kind ?? '',
      a.stepIndex == null ? -1 : a.stepIndex,
      a.stepName ?? '',
      a.uses ?? '',
      a.line ?? 0
    ];
    const keyB = [
      b.workflowFile ?? '',
      b.jobId ?? '',
      b.kind ?? '',
      b.stepIndex == null ? -1 : b.stepIndex,
      b.stepName ?? '',
      b.uses ?? '',
      b.line ?? 0
    ];
    for (let i = 0; i < keyA.length; i += 1) {
      if (keyA[i] < keyB[i]) return -1;
      if (keyA[i] > keyB[i]) return 1;
    }
    return 0;
  });
}

function buildViolations(entries) {
  const violations = [];
  for (const entry of entries) {
    if (entry.pinType === 'local') continue;
    if (entry.pinType === 'docker-digest') continue;
    if (entry.pinType === 'commit-sha') continue;

    let reason = 'Unpinned or non-auditable action reference';
    if (entry.pinType === 'floating-ref') {
      reason =
        'Floating ref (tag/branch) is not allowed; must pin to a full commit SHA';
    }
    if (entry.pinType === 'docker-unpinned') {
      reason = 'Docker action must be pinned by sha256 digest';
    }
    if (entry.pinType === 'dynamic') {
      reason =
        'Dynamic uses/ref expression is not auditable; must be a literal pinned SHA';
    }
    if (entry.pinType === 'unknown') {
      reason =
        'Unknown uses: form; only local ./, docker://@sha256, or owner/repo@<sha> are allowed';
    }

    violations.push({
      workflowFile: entry.workflowFile,
      workflowName: entry.workflowName,
      jobId: entry.jobId,
      jobName: entry.jobName,
      stepIndex: entry.stepIndex,
      stepName: entry.stepName,
      kind: entry.kind,
      uses: entry.uses,
      line: entry.line,
      reason
    });
  }

  return violations.sort((a, b) => {
    const keyA = [
      a.workflowFile ?? '',
      a.jobId ?? '',
      a.kind ?? '',
      a.stepIndex == null ? -1 : a.stepIndex,
      a.stepName ?? '',
      a.line ?? 0,
      a.uses ?? ''
    ];
    const keyB = [
      b.workflowFile ?? '',
      b.jobId ?? '',
      b.kind ?? '',
      b.stepIndex == null ? -1 : b.stepIndex,
      b.stepName ?? '',
      b.line ?? 0,
      b.uses ?? ''
    ];
    for (let i = 0; i < keyA.length; i += 1) {
      if (keyA[i] < keyB[i]) return -1;
      if (keyA[i] > keyB[i]) return 1;
    }
    return 0;
  });
}

export async function runActionPinningGate({ workflowsDir, outFile }) {
  const dirents = await fs
    .readdir(workflowsDir, { withFileTypes: true })
    .catch((error) => {
      if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
        throw new Error(`Workflows directory not found: ${workflowsDir}`);
      }
      throw error;
    });

  const workflowFiles = dirents
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort((a, b) => a.localeCompare(b));

  const allEntries = [];
  for (const fileName of workflowFiles) {
    const abs = path.join(workflowsDir, fileName);
    const rel = path
      .relative(process.cwd(), abs)
      .replaceAll(path.sep, '/');
    const text = await fs.readFile(abs, 'utf8');
    const entries = scanWorkflowText(text, rel);
    allEntries.push(...entries);
  }

  const inventory = sortInventoryEntries(allEntries);

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  const payload = {
    schema: 'summit.ci-sbom.actions/v1',
    workflowsDir: path
      .relative(process.cwd(), workflowsDir)
      .replaceAll(path.sep, '/'),
    entries: inventory.map((entry) => ({
      workflowFile: entry.workflowFile,
      workflowName: entry.workflowName,
      jobId: entry.jobId,
      jobName: entry.jobName,
      kind: entry.kind,
      stepIndex: entry.stepIndex,
      stepName: entry.stepName,
      uses: entry.uses,
      owner: entry.owner,
      repo: entry.repo,
      actionPath: entry.actionPath,
      ref: entry.ref,
      isPinned: entry.isPinned,
      pinType: entry.pinType,
      firstParty: entry.firstParty,
      thirdParty: entry.thirdParty,
      line: entry.line
    }))
  };

  await fs.writeFile(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const violations = buildViolations(inventory);
  return { inventoryCount: inventory.length, violations, outFile };
}

function formatViolation(violation) {
  const location = `${violation.workflowFile}:${violation.line}`;
  const context =
    violation.kind === 'job'
      ? `job=${violation.jobId}${violation.jobName ? ` (${violation.jobName})` : ''}`
      : `job=${violation.jobId}${violation.jobName ? ` (${violation.jobName})` : ''}, step=${violation.stepIndex}${violation.stepName ? ` (${violation.stepName})` : ''}`;
  return `- ${location} | ${context} | uses: ${violation.uses} | ${violation.reason}`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage:
  node scripts/ci/action_pinning_gate.mjs [--workflows-dir <dir>] [--out <file>]

Defaults:
  --workflows-dir ${DEFAULT_WORKFLOWS_DIR}
  --out           ${DEFAULT_OUT_FILE}

Behavior:
  - Scans workflow YAML for job-level and step-level "uses:" entries.
  - Allows only:
      * local actions: ./...
      * docker actions: docker://...@sha256:<digest>
      * marketplace actions/reusable workflows pinned to full 40-char commit SHA: owner/repo@<sha>
  - Writes deterministic inventory JSON to the output path.
  - Exits non-zero if any unpinned action reference is found.
`);
    process.exit(0);
  }

  const { inventoryCount, violations, outFile } = await runActionPinningGate({
    workflowsDir: args.workflowsDir,
    outFile: args.outFile
  });

  if (violations.length > 0) {
    console.error('CI Action Pinning Gate: FAILED');
    console.error(
      `Inventory written: ${path
        .relative(process.cwd(), outFile)
        .replaceAll(path.sep, '/')}`
    );
    console.error(
      `Found ${violations.length} unpinned/dynamic/invalid action reference(s):`
    );
    for (const violation of violations) {
      console.error(formatViolation(violation));
    }
    console.error('');
    console.error(
      'Remediation (preferred): run the autopinner, review diffs, and commit:'
    );
    console.error('  node scripts/ci/pin_actions.mjs --write');
    console.error('Then re-run:');
    console.error('  node scripts/ci/action_pinning_gate.mjs');
    process.exit(1);
  }

  console.log(`CI Action Pinning Gate: OK (${inventoryCount} uses: entries)`);
  console.log(
    `Inventory written: ${path
      .relative(process.cwd(), outFile)
      .replaceAll(path.sep, '/')}`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.stack ?? String(error));
    process.exit(2);
  });
}
