#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  classifyHardeningCheck,
  summarizeHardeningChecks,
  truncateOutput,
} from './lib/hardening-audit.mjs';

const DEFAULT_OUT = 'artifacts/ga-hardening-audit.json';
const DEFAULT_TIMEOUT_MS = 120000;
const MAX_BUFFER = 20 * 1024 * 1024;

const CHECKS = [
  {
    name: 'dependency:outdated',
    command: 'pnpm',
    args: ['outdated', '--recursive', '--format', 'json'],
    timeoutMs: 120000,
  },
  {
    name: 'security:audit',
    command: 'pnpm',
    args: ['audit', '--json'],
    timeoutMs: 120000,
  },
  { name: 'lint', command: 'pnpm', args: ['lint'], timeoutMs: 120000 },
  { name: 'typecheck', command: 'pnpm', args: ['typecheck'], timeoutMs: 120000 },
  { name: 'test', command: 'pnpm', args: ['test'], timeoutMs: 120000 },
  { name: 'build', command: 'pnpm', args: ['build'], timeoutMs: 120000 },
];

const OUTDATED_RECURSIVE_BUG_PATTERN =
  /Cannot read properties of undefined \(reading 'optionalDependencies'\)/i;

const parseArgs = (argv) => {
  const parsed = { out: DEFAULT_OUT, timeoutMs: DEFAULT_TIMEOUT_MS, checks: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--out') {
      parsed.out = argv[index + 1] ?? parsed.out;
      index += 1;
      continue;
    }
    if (token === '--timeout-ms') {
      const value = Number.parseInt(argv[index + 1] ?? '', 10);
      if (Number.isFinite(value) && value > 0) {
        parsed.timeoutMs = value;
      }
      index += 1;
      continue;
    }
    if (token === '--checks') {
      const values = (argv[index + 1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (values.length > 0) {
        parsed.checks = values;
      }
      index += 1;
    }
  }
  return parsed;
};

const appendChunk = (current, chunk) => {
  const next = current + chunk;
  return next.length > MAX_BUFFER ? next.slice(0, MAX_BUFFER) : next;
};

const killProcessTree = (pid, signal) => {
  if (pid == null) {
    return;
  }
  try {
    process.kill(pid, signal);
    return;
  } catch {
    // Ignore and try process group kill.
  }
  try {
    process.kill(-pid, signal);
    return;
  } catch {
    // Already exited.
  }
};

const runCommandWithTimeout = ({ command, args, timeoutMs }) =>
  new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const child = spawn(command, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      detached: false,
    });

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout = appendChunk(stdout, chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr = appendChunk(stderr, chunk);
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      killProcessTree(child.pid, 'SIGTERM');
      setTimeout(() => killProcessTree(child.pid, 'SIGKILL'), 2000);

      // Resolve regardless of close-event reliability to prevent hangs.
      setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        resolve({
          status: 124,
          signal: 'SIGTERM',
          errorCode: 'ETIMEDOUT',
          stdout,
          stderr: appendChunk(stderr, 'Timed out and force-terminated by GA hardening runner.\n'),
        });
      }, 2500);
    }, timeoutMs);

    child.on('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({
        status: 1,
        signal: null,
        errorCode: error?.code ?? 'SPAWN_ERROR',
        stdout,
        stderr: appendChunk(stderr, `${error?.message ?? String(error)}\n`),
      });
    });

    child.on('close', (status, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({
        status,
        signal,
        errorCode: timedOut ? 'ETIMEDOUT' : null,
        stdout,
        stderr,
      });
    });
  });

const runCheck = async (check, timeoutOverrideMs) => {
  const startMs = Date.now();
  const timeoutMs = timeoutOverrideMs ?? check.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const primary = await runCommandWithTimeout({
    command: check.command,
    args: check.args,
    timeoutMs,
  });
  let child = primary;
  let output = `${primary.stdout}${primary.stderr}`;
  let fallback = null;

  const shouldUseOutdatedFallback =
    check.name === 'dependency:outdated' &&
    (primary.status ?? 1) !== 0 &&
    (OUTDATED_RECURSIVE_BUG_PATTERN.test(output) ||
      primary.errorCode === 'ETIMEDOUT' ||
      primary.signal === 'SIGTERM' ||
      output.trim().length === 0);

  if (shouldUseOutdatedFallback) {
    const fallbackTimeoutMs = Math.max(timeoutMs, 2000);
    const fallbackCommand = {
      command: 'pnpm',
      args: ['--dir', process.cwd(), 'outdated', '--format', 'json'],
      timeoutMs: fallbackTimeoutMs,
    };
    const fallbackResult = await runCommandWithTimeout(fallbackCommand);
    fallback = {
      command: fallbackCommand.command,
      args: fallbackCommand.args,
      exitCode: fallbackResult.status,
      signal: fallbackResult.signal,
      errorCode: fallbackResult.errorCode,
    };
    const fallbackOutput = `${fallbackResult.stdout}${fallbackResult.stderr}`;
    if (fallbackOutput.trim().length > 0 || fallbackResult.status != null) {
      child = fallbackResult;
      output = `${output}\n[fallback] ${fallbackCommand.command} ${fallbackCommand.args.join(' ')}\n${fallbackOutput}`;
    }
  }

  const durationMs = Date.now() - startMs;
  const classified = classifyHardeningCheck({
    name: check.name,
    exitCode: child.status ?? 1,
    signal: child.signal,
    errorCode: child.errorCode,
    output,
  });

  return {
    name: check.name,
    command: check.command,
    args: check.args,
    timeoutMs,
    durationMs,
    exitCode: child.status,
    signal: child.signal,
    errorCode: child.errorCode,
    status: classified.status,
    reason: classified.reason,
    fallback,
    output: truncateOutput(output),
  };
};

const main = async () => {
  const { out, timeoutMs, checks } = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const selectedChecks =
    checks == null ? CHECKS : CHECKS.filter((check) => checks.includes(check.name));

  if (selectedChecks.length === 0) {
    throw new Error(
      `No checks matched --checks=${checks?.join(',') ?? ''}. Valid checks: ${CHECKS.map((check) => check.name).join(', ')}`
    );
  }

  const results = [];
  for (const check of selectedChecks) {
    console.log(
      `[ga-hardening] ${check.name}: ${check.command} ${check.args.join(' ')}`
    );
    const result = await runCheck(check, timeoutMs);
    results.push(result);
    console.log(
      `[ga-hardening] ${check.name}: ${result.status} (exit=${result.exitCode ?? 'null'}, signal=${result.signal ?? 'none'})`
    );
  }

  const summary = summarizeHardeningChecks(results);
  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    finishedAt: new Date().toISOString(),
    nodeVersion: process.version,
    cwd: process.cwd(),
    checks: results,
    summary,
  };

  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[ga-hardening] wrote ${out}`);
  process.exit(summary.failed > 0 ? 1 : 0);
};

main().catch((error) => {
  console.error('[ga-hardening] crashed:', error);
  process.exitCode = 1;
});
