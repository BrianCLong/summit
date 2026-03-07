#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ALLOWED_ACTIONS = new Set([
  'open',
  'type',
  'press',
  'check',
  'screenshot',
  'wait',
  'select',
  'navigate',
]);

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

function hashFor(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function redactUrl(raw) {
  try {
    const url = new URL(raw);
    url.search = '';
    return url.toString();
  } catch {
    return raw;
  }
}

function validateSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('Spec must include a non-empty steps array.');
  }
  for (const [idx, step] of steps.entries()) {
    if (!ALLOWED_ACTIONS.has(step.action)) {
      throw new Error(`Step ${idx} has disallowed action: ${step.action}`);
    }
    if (typeof step.target === 'string' && /[;&|`$()]/.test(step.target)) {
      throw new Error(`Step ${idx} target contains forbidden shell metacharacters.`);
    }
    if (typeof step.value === 'string' && /[;&|`$()]/.test(step.value)) {
      throw new Error(`Step ${idx} value contains forbidden shell metacharacters.`);
    }
  }
}

function ensureAllowedDomain(startUrl, allowedDomains) {
  const hostname = new URL(startUrl).hostname;
  if (!allowedDomains.includes(hostname)) {
    throw new Error(`Domain '${hostname}' is not in allowlist.`);
  }
}

function runCommand(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

export async function doctor({ exec = runCommand } = {}) {
  const flagEnabled = process.env.SUMMIT_ENABLE_PLAYWRIGHT_CLI === '1';
  const version = await exec('pnpm', ['exec', 'playwright-cli', '--version']);
  const ok = version.code === 0;
  return {
    status: ok ? 'ok' : 'error',
    feature_flag_enabled: flagEnabled,
    command: 'pnpm exec playwright-cli --version',
    version_stdout: version.stdout,
    version_stderr: version.stderr,
    exit_code: version.code,
  };
}

export async function runSpec({ specPath, outRoot = 'artifacts/playwright-cli', exec = runCommand }) {
  if (process.env.SUMMIT_ENABLE_PLAYWRIGHT_CLI !== '1') {
    throw new Error('Playwright CLI feature flag is disabled. Set SUMMIT_ENABLE_PLAYWRIGHT_CLI=1.');
  }

  const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
  validateSteps(spec.steps);
  ensureAllowedDomain(spec.startUrl, spec.allowedDomains ?? []);

  const normalizedSpec = {
    name: spec.name,
    startUrl: redactUrl(spec.startUrl),
    allowedDomains: [...(spec.allowedDomains ?? [])].sort(),
    steps: spec.steps.map((step) => ({
      action: step.action,
      target: typeof step.target === 'string' ? step.target : undefined,
      value: typeof step.value === 'string' ? step.value : undefined,
      expect: step.expect ?? undefined,
      output: step.output ?? undefined,
    })),
  };

  const runHash = hashFor(stableStringify(normalizedSpec)).slice(0, 16);
  const runDir = path.join(outRoot, runHash);
  await fs.mkdir(runDir, { recursive: true });

  const transcript = [];
  const started = process.hrtime.bigint();

  for (const [index, step] of normalizedSpec.steps.entries()) {
    const args = [step.action];
    if (step.target) args.push(step.target);
    if (step.value) args.push(step.value);
    if (step.output) args.push(step.output);

    const result = await exec('pnpm', ['exec', 'playwright-cli', ...args]);
    if (result.code !== 0) {
      throw new Error(`Step ${index} failed for action '${step.action}': ${result.stderr || result.stdout}`);
    }

    transcript.push({
      id: `EVID:PWCLI:${runHash}:${index + 1}`,
      action: step.action,
      args,
      stdout: result.stdout,
    });
  }

  const ended = process.hrtime.bigint();
  const durationMs = Number((ended - started) / 1000000n);
  const report = {
    run_id: runHash,
    spec: path.normalize(specPath),
    start_url: normalizedSpec.startUrl,
    step_count: normalizedSpec.steps.length,
    status: 'success',
  };
  const evidence = {
    run_id: runHash,
    transcript,
    artifacts: normalizedSpec.steps
      .filter((step) => step.action === 'screenshot' && step.output)
      .map((step) => ({ type: 'screenshot', path: step.output })),
  };
  const metrics = {
    duration_ms: durationMs,
    peak_rss_mb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    artifact_bytes: 0,
  };

  await fs.writeFile(path.join(runDir, 'report.json'), `${stableStringify(report)}\n`);
  await fs.writeFile(path.join(runDir, 'evidence.json'), `${stableStringify(evidence)}\n`);
  await fs.writeFile(path.join(runDir, 'metrics.json'), `${stableStringify(metrics)}\n`);

  return { run_id: runHash, run_dir: runDir, report, evidence, metrics };
}

