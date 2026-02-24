#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const REQUIRED_WORKFLOWS = [
  'ci-core.yml',
  'ci-pr.yml',
  'ci-security.yml',
  'ci-verify.yml',
  'codeql.yml',
  'agent-guardrails.yml',
  'agentic-plan-gate.yml',
];

const REQUIRED_ROOT_ANCHORS = [
  'docker-compose.yml',
  'docker-compose.prod.yml',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
];

const EXCEPTIONS_FILE = '.github/policies/canonical-path-exceptions.json';

const WORKFLOW_NAME_ALLOW = /^(ci-[a-z0-9._-]+|_reusable-[a-z0-9._-]+|codeql|agent-guardrails|agentic-plan-gate)\.ya?ml$/;
const DOCS_TOPLEVEL_ALLOW = new Set([
  'architecture',
  'api',
  'security',
  'governance',
  'operations',
  'ga',
]);

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function loadExceptions() {
  try {
    if (!fs.existsSync(EXCEPTIONS_FILE)) {
      return new Set();
    }
    const data = JSON.parse(fs.readFileSync(EXCEPTIONS_FILE, 'utf8'));
    if (!Array.isArray(data.exceptions)) {
      return new Set();
    }
    return new Set(data.exceptions);
  } catch {
    return new Set();
  }
}

function getMergeBase() {
  const baseRef = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : process.env.BASE_REF || 'origin/main';

  try {
    run(`git rev-parse --verify ${baseRef}`);
    return run(`git merge-base HEAD ${baseRef}`);
  } catch {
    try {
      return run('git rev-parse HEAD~1');
    } catch {
      return run('git rev-parse HEAD');
    }
  }
}

function parseNameStatus(diffText) {
  if (!diffText) return [];
  return diffText
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t');
      const status = parts[0];
      if (status.startsWith('R')) {
        return { status: 'R', path: parts[2], oldPath: parts[1] };
      }
      return { status: status[0], path: parts[1] };
    })
    .filter((entry) => entry.path);
}

function isWorkflowFile(filePath) {
  return (
    filePath.startsWith('.github/workflows/') &&
    /\.ya?ml$/.test(filePath)
  );
}

function checkWorkflowPath(filePath, errors, exceptions) {
  if (exceptions.has(filePath)) return;
  const relative = filePath.slice('.github/workflows/'.length);
  if (relative.includes('/')) {
    errors.push(
      `${filePath}: workflows must be top-level under .github/workflows/ (no nested directories)`,
    );
    return;
  }

  const filename = path.basename(filePath);
  if (!WORKFLOW_NAME_ALLOW.test(filename)) {
    errors.push(
      `${filePath}: filename must be ci-*.yml or _reusable-*.yml (allowlist: codeql.yml, agent-guardrails.yml, agentic-plan-gate.yml)`,
    );
  }
}

function checkWorkflowContent(filePath, errors, exceptions) {
  if (exceptions.has(filePath)) return;
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  const forbiddenRunnerInvocations = [
    /\bnpx\s+jest\b/i,
    /\bnpx\s+vitest\b/i,
    /\bnpx\s+playwright\s+test\b/i,
    /\bpython(?:3)?\s+-m\s+pytest\b/i,
    /\bpytest\b/i,
    /\bcypress\s+run\b/i,
    /\bmocha\b/i,
    /\bnpm\s+test\b/i,
  ];

  for (const pattern of forbiddenRunnerInvocations) {
    if (pattern.test(content)) {
      errors.push(
        `${filePath}: direct test runner invocation detected (${pattern}); use pnpm scripts (pnpm test, pnpm test:e2e, pnpm test:coverage)`,
      );
      break;
    }
  }

  // CI helper scripts must live in .github/scripts.
  if (/\b(?:\.\/)?scripts\//.test(content) && !/\.github\/scripts\//.test(content)) {
    errors.push(
      `${filePath}: references scripts/ paths; CI helper scripts must resolve from .github/scripts/`,
    );
  }
}

function checkAddedPathRules(filePath, errors, exceptions) {
  if (exceptions.has(filePath)) return;
  if (/^\.github\/workflows\/.*\/action\.ya?ml$/i.test(filePath)) {
    errors.push(
      `${filePath}: composite actions must live under .github/actions/<name>/action.yml, not .github/workflows/`,
    );
  }

  if (/^\.github\//.test(filePath) && /milestone/i.test(path.basename(filePath))) {
    if (!filePath.startsWith('.github/MILESTONES/')) {
      errors.push(
        `${filePath}: milestone/gate configs must live under .github/MILESTONES/`,
      );
    }
  }

  if (filePath.startsWith('docs/') && /\.ya?ml$/i.test(filePath)) {
    errors.push(
      `${filePath}: automation/config YAML must not be added under docs/`,
    );
  }

  if (filePath.startsWith('src/')) {
    if (filePath.startsWith('src/utils/')) {
      errors.push(
        `${filePath}: top-level src/utils is non-canonical; use domain-local shared utilities`,
      );
      return;
    }

    const allowed =
      filePath.startsWith('src/api/graphql/') ||
      filePath.startsWith('src/api/rest/') ||
      filePath.startsWith('src/agents/') ||
      /^src\/connectors\/[^/]+\//.test(filePath) ||
      filePath.startsWith('src/graphrag/');

    if (!allowed) {
      errors.push(
        `${filePath}: new src paths must use canonical namespaces (src/api/graphql, src/api/rest, src/agents, src/connectors/<source>, src/graphrag)`,
      );
    }
  }

  if (filePath.startsWith('tests/')) {
    const allowed = /^tests\/(e2e|[^/]+)\//.test(filePath);
    if (!allowed) {
      errors.push(
        `${filePath}: new test paths must be tests/<module>/... or tests/e2e/...`,
      );
    }
  }

  if (filePath.startsWith('docs/')) {
    const parts = filePath.split('/');
    if (parts.length < 3 || !DOCS_TOPLEVEL_ALLOW.has(parts[1])) {
      errors.push(
        `${filePath}: new docs paths must be under docs/{architecture,api,security,governance,operations,ga}/...`,
      );
    }
  }
}

function checkRepoAnchors(errors) {
  for (const required of REQUIRED_ROOT_ANCHORS) {
    if (!fs.existsSync(required)) {
      errors.push(`Missing required root anchor: ${required}`);
    }
  }

  for (const wf of REQUIRED_WORKFLOWS) {
    const wfPath = path.join('.github', 'workflows', wf);
    if (!fs.existsSync(wfPath)) {
      errors.push(`Missing required workflow: ${wfPath}`);
    }
  }
}

function main() {
  const errors = [];
  const exceptions = loadExceptions();
  const mergeBase = getMergeBase();
  const diffText = run(`git diff --name-status --diff-filter=ACMR ${mergeBase}..HEAD`);
  const changed = parseNameStatus(diffText);

  for (const entry of changed) {
    if (isWorkflowFile(entry.path)) {
      if (entry.status === 'A' || entry.status === 'R') {
        checkWorkflowPath(entry.path, errors, exceptions);
      }
      if (entry.status === 'A') {
        checkWorkflowContent(entry.path, errors, exceptions);
      }
    }

    if (entry.status === 'A') {
      checkAddedPathRules(entry.path, errors, exceptions);
    }
  }

  checkRepoAnchors(errors);

  if (errors.length > 0) {
    console.error('::group::Canonical Structure Verification Errors');
    for (const error of errors) {
      console.error(`::error::${error}`);
    }
    console.error('::endgroup::');
    process.exit(1);
  }

  console.log('Canonical structure verification passed.');
}

main();
