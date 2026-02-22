import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const steps = [
  {
    name: 'sanitize:type-stubs',
    command: 'bash',
    args: ['-lc', 'rm -rf node_modules/@types/hapi__catbox node_modules/@types/hapi__shot'],
  },
  { name: 'typecheck', command: 'pnpm', args: ['typecheck'] },
  { name: 'lint', command: 'pnpm', args: ['lint'] },
  { name: 'build', command: 'pnpm', args: ['build'] },
  {
    name: 'server:test:unit',
    command: 'pnpm',
    args: ['--filter', 'intelgraph-server', 'test:unit'],
    env: { GA_VERIFY_MODE: 'true' },
  },
  { name: 'ga:smoke', command: 'pnpm', args: ['ga:smoke'] },
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
  status: 'running',
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
  console.log(`[ga-verify] Starting ${step.name}: ${step.command} ${step.args.join(' ')}`);

  const result = spawnSync(step.command, step.args, {
    env: { ...process.env, ...(step.env ?? {}) },
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
    shell: false,
  });

  const output = [result.stdout, result.stderr].filter(Boolean).join('');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  await fs.writeFile(logPath, output);
  await fs.writeFile(tailPath, tailFor(output));

  const durationMs = Date.now() - start;
  const entry = {
    name: step.name,
    status: result.status === 0 ? 'passed' : 'failed',
    durationMs,
    exitCode: result.status,
    logPath: path.relative(process.cwd(), logPath),
    tailPath: path.relative(process.cwd(), tailPath),
  };

  stamp.steps.push(entry);
  await writeStamp({ steps: stamp.steps });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const error = new Error(`Step ${step.name} failed (exit ${result.status})`);
    error.step = step.name;
    throw error;
  }
};

const heartbeat = setInterval(() => {
  writeStamp({ lastHeartbeatAt: new Date().toISOString() }).catch(() => {});
}, 30000);

const handleSignal = (signal) => {
  console.warn(`[ga-verify] Received ${signal}, finalizing stamp.`);
  writeStamp({
    finishedAt: new Date().toISOString(),
    status: 'aborted',
    failureSummary: { signal },
  }).finally(() => {
    clearInterval(heartbeat);
    process.exit(1);
  });
};

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

const main = async () => {
  let currentStep = null;
  try {
    await writeStamp({ status: 'running' });
    for (const step of steps) {
      currentStep = step.name;
      await runStep(step);
    }
    await writeStamp({
      finishedAt: new Date().toISOString(),
      status: 'passed',
    });
  } catch (error) {
    await writeStamp({
      finishedAt: new Date().toISOString(),
      status: 'failed',
      failureSummary: {
        step: currentStep,
        message: error?.message ?? 'Unknown failure',
      },
    });
    throw error;
  } finally {
    clearInterval(heartbeat);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
