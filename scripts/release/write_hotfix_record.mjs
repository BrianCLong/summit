#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  buildHotfixRecord,
  stableStringify,
} from './hotfix-utils.mjs';

const { values } = parseArgs({
  options: {
    output: { type: 'string' },
    selection: { type: 'string' },
    evidence: { type: 'string' },
    dashboard: { type: 'string' },
    'dashboard-sha': { type: 'string' },
    actor: { type: 'string' },
    'final-commit': { type: 'string' },
    'workflow-run-id': { type: 'string' },
    'workflow-run-url': { type: 'string' },
  },
  strict: false,
});

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!values.output) {
  fail('Missing --output');
}
if (!values.selection) {
  fail('Missing --selection');
}
if (!values.evidence) {
  fail('Missing --evidence');
}
if (!values.dashboard) {
  fail('Missing --dashboard');
}

if (!existsSync(values.selection)) {
  fail(`Selection file not found: ${values.selection}`);
}
if (!existsSync(values.evidence)) {
  fail(`Evidence summary not found: ${values.evidence}`);
}
if (!existsSync(values.dashboard)) {
  fail(`Dashboard summary not found: ${values.dashboard}`);
}

const selection = JSON.parse(readFileSync(values.selection, 'utf-8'));
const evidence = JSON.parse(readFileSync(values.evidence, 'utf-8'));
const dashboard = JSON.parse(readFileSync(values.dashboard, 'utf-8'));

const record = buildHotfixRecord({
  tag: `v${selection.target_version}`,
  version: selection.target_version,
  baseTag: selection.base_tag,
  baseCommit: selection.base_commit,
  selectedCommits: selection.selected_commits,
  finalCommit: values['final-commit'] || selection.head_commit || selection.base_commit,
  evidence: {
    sha256: evidence.evidence_sha256,
    signature: evidence.signature,
    signature_method: evidence.signature_method,
  },
  dashboard: {
    sha256: values['dashboard-sha'] || dashboard.sha256 || null,
    summary_path: 'artifacts/hotfix-dashboard/site/dashboard_summary.json',
  },
  actor: values.actor || null,
  workflowRun: {
    id: values['workflow-run-id'] || null,
    url: values['workflow-run-url'] || null,
  },
  recordedAt: new Date().toISOString(),
});

writeFileSync(values.output, stableStringify(record));
