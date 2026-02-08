import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const steps = [
  { name: 'typecheck', command: 'pnpm', args: ['typecheck'], timeout: 300000 },
  { name: 'lint', command: 'pnpm', args: ['lint'], timeout: 300000 },
  { name: 'build', command: 'pnpm', args: ['build'], timeout: 600000 },
  {
    name: 'server:test:unit',
    command: 'pnpm',
    args: ['--filter', 'intelgraph-server', 'test:unit'],
    env: { GA_VERIFY_MODE: 'true' },
    timeout: 600000,
  },
  { name: 'ga:smoke', command: 'pnpm', args: ['ga:smoke'], timeout: 300000 },
];

const gitSha = spawnSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
  stdio: 'pipe',
}).stdout?.trim();

const sha = process.env.GA_VERIFY_SHA || gitSha || 'unknown';
const outDir = path.join('artifacts', 'ga-verify', sha);
const logsDir = path.join(outDir, 'logs');
const stampPath = path.join(outDir, 'stamp.json');

const stamp = {
  sha,
  startedAt: new Date().toISOString(),
  status: 'started',
  steps: [],
  toolchain: {
    node: process.version,
    pnpm: process.env.npm_config_user_agent ?? null,
  },
};

const tailLines = 200;

const tailFor = (content) =>
  content
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-tailLines)
    .join('\n');

const writeStamp = async (patch = {}) => {
  Object.assign(stamp, patch);
  await fs.mkdir(path.dirname(stampPath), { recursive: true });
  await fs.writeFile(stampPath, JSON.stringify(stamp, null, 2));
};

const runStep = async (step) => {
  const logPath = path.join(logsDir, `${step.name}.log`);
  const tailPath = path.join(logsDir, `${step.name}.tail.log`);
  await fs.mkdir(logsDir, { recursive: true });
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] [ga-verify] Starting ${step.name}: ${step.command} ${step.args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      env: { ...process.env, ...(step.env ?? {}) },
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
    });

    let output = '';
    child.stdout.on('data', (data) => {
      const s = data.toString();
      output += s;
      process.stdout.write(s);
    });

    child.stderr.on('data', (data) => {
      const s = data.toString();
      output += s;
      process.stderr.write(s);
    });

    const timeout = step.timeout || 300000;
    let isTimedOut = false;
    const timer = setTimeout(() => {
      isTimedOut = true;
      console.error(`[ga-verify] Step ${step.name} timed out after ${timeout}ms`);
      child.kill('SIGKILL');
    }, timeout);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('exit', async (code, signal) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      console.log(`[${new Date().toISOString()}] [ga-verify] Step ${step.name} finished with code ${code}${signal ? ` (signal ${signal})` : ''} (Duration: ${durationMs}ms)`);

      try {
        await fs.writeFile(logPath, output);
        await fs.writeFile(tailPath, tailFor(output));
      } catch (e) {
        console.error(`[ga-verify] Failed to write logs for ${step.name}:`, e);
      }

      const status = code === 0 ? 'passed' : 'failed';
      const entry = {
        name: step.name,
        status,
        durationMs,
        exitCode: code,
        signal,
        logPath: path.relative(process.cwd(), logPath),
        tailPath: path.relative(process.cwd(), tailPath),
      };

      stamp.steps.push(entry);
      await writeStamp({ steps: stamp.steps });

      if (code === 0 && !isTimedOut) {
        resolve();
      } else {
        const error = isTimedOut
          ? new Error(`Step ${step.name} timed out`)
          : new Error(`Step ${step.name} failed with exit code ${code} and signal ${signal}`);
        error.step = step.name;
        error.exitCode = code;
        error.signal = signal;
        error.timeout = isTimedOut;
        reject(error);
      }
    });
  });
};

const startTime = Date.now();
const heartbeat = setInterval(() => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  console.log(`[${new Date().toISOString()}] [ga-verify] Heartbeat - Elapsed: ${elapsed}s`);
  writeStamp({ lastHeartbeatAt: new Date().toISOString() }).catch(() => {});
}, 30000);

const finalizeStamp = async (status, failureSummary = null) => {
  clearInterval(heartbeat);
  await writeStamp({
    finishedAt: new Date().toISOString(),
    status,
    failureSummary,
  });
};

const handleSignal = (signal) => {
  console.warn(`\n[ga-verify] Received ${signal}, finalizing stamp.`);
  finalizeStamp('aborted', { signal }).then(() => {
    process.exit(1);
  });
};

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

process.on('uncaughtException', async (err) => {
  console.error('[ga-verify] Uncaught Exception:', err);
  await finalizeStamp('failed', {
    message: err?.message ?? 'Uncaught Exception',
    stack: err?.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('[ga-verify] Unhandled Rejection:', reason);
  await finalizeStamp('failed', {
    message: reason?.message ?? String(reason),
    stack: reason?.stack,
  });
  process.exit(1);
});

const main = async () => {
  let currentStepName = 'initialization';
  try {
    await writeStamp({ status: 'running' });
    for (const step of steps) {
      currentStepName = step.name;
      await runStep(step);
    }
    await finalizeStamp('passed');
    console.log(`[ga-verify] All steps passed. Stamp written to ${stampPath}`);
  } catch (error) {
    console.error(`[ga-verify] Failed at step ${currentStepName}:`, error.message);
    await finalizeStamp('failed', {
      step: currentStepName,
      message: error.message,
      timeout: !!error.timeout,
    });
    process.exit(1);
  }
};

main().catch(async (error) => {
  console.error('[ga-verify] Unhandled error in main:', error);
  await finalizeStamp('failed', {
    message: error?.message ?? 'Unhandled error',
  });
  process.exit(1);
});
