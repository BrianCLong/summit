import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  evaluateChangeContracts,
  formatAjvErrors,
  isSensitiveChange,
  listIntentFiles,
  validateIntentFile
} from '../intent/intent-validator.mjs';

function runGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    return { ok: false, stdout: '', stderr: result.stderr || '' };
  }
  return { ok: true, stdout: result.stdout || '', stderr: '' };
}

function readPullRequestBody() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    return '';
  }

  const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  return payload.pull_request?.body || '';
}

function detectAiGenerated() {
  if (process.env.AI_GENERATED === 'true') {
    return true;
  }

  if (process.env.AGENT_ID || process.env.AGENT_TASK_ID || process.env.AGENT_PROMPT_HASH) {
    return true;
  }

  const body = readPullRequestBody();
  return body.includes('AGENT-METADATA') || body.includes('agent_id');
}

function resolveChangedFiles() {
  const baseRef = process.env.GITHUB_BASE_REF;
  const baseArg = baseRef ? `origin/${baseRef}` : 'HEAD~1';
  const diffResult = runGit(['diff', '--name-only', `${baseArg}...HEAD`]);

  if (!diffResult.ok) {
    return [];
  }

  return diffResult.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const changedFiles = resolveChangedFiles();
const aiGenerated = detectAiGenerated();
const sensitiveChange = isSensitiveChange(changedFiles);

if (!aiGenerated && !sensitiveChange) {
  console.log('Intent spec validation skipped: no AI metadata or sensitive changes detected.');
  process.exit(0);
}

const intentDir = path.resolve('.summit/intent');
const intentFiles = listIntentFiles(intentDir);

if (intentFiles.length === 0) {
  console.error('Intent spec required but none found in .summit/intent.');
  process.exit(1);
}

let hasErrors = false;

intentFiles.forEach((filePath) => {
  const result = validateIntentFile(filePath);
  if (!result.valid) {
    hasErrors = true;
    console.error(`Intent spec invalid: ${filePath}`);
    formatAjvErrors(result.errors).forEach((error) => {
      console.error(`  - ${error}`);
    });
  }

  const findings = evaluateChangeContracts(result.data, changedFiles);
  if (findings.length > 0) {
    hasErrors = true;
    console.error(`Change contract violations for ${filePath}:`);
    findings.forEach((finding) => {
      console.error(`  - ${finding}`);
    });
  }
});

if (hasErrors) {
  process.exit(1);
}

console.log('Intent spec validation completed successfully.');
