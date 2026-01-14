import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { sha256File, writeRunManifest } from '../ci/lib/cas.mjs';

const steps = [
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
const reportJsonPath = path.join(outDir, 'report.json');
const reportMarkdownPath = path.join(outDir, 'report.md');

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

const maybeHash = async (filePath) => {
  try {
    return await sha256File(filePath);
  } catch (error) {
    return null;
  }
};

const writeReport = async (status) => {
  const report = {
    schema_version: '1',
    sha,
    status,
    started_at: stamp.startedAt,
    finished_at: stamp.finishedAt ?? new Date().toISOString(),
    steps: stamp.steps,
    failure_summary: stamp.failureSummary ?? null,
    toolchain: stamp.toolchain,
  };

  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    '# GA Verify Report',
    '',
    `- Status: ${status}`,
    `- SHA: ${sha}`,
    `- Started: ${report.started_at}`,
    `- Finished: ${report.finished_at}`,
    `- Steps: ${stamp.steps.length}`,
    '',
  ];

  if (stamp.failureSummary) {
    lines.push('## Failure Summary');
    lines.push('');
    lines.push(`- Step: ${stamp.failureSummary.step || 'unknown'}`);
    lines.push(`- Message: ${stamp.failureSummary.message || 'unknown'}`);
    lines.push('');
  }

  await fs.writeFile(reportMarkdownPath, `${lines.join('\n')}\n`);
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
  let status = 'running';
  try {
    await writeStamp({ status: 'running' });
    for (const step of steps) {
      currentStep = step.name;
      await runStep(step);
    }
    status = 'passed';
    await writeStamp({
      finishedAt: new Date().toISOString(),
      status,
    });
  } catch (error) {
    status = 'failed';
    await writeStamp({
      finishedAt: new Date().toISOString(),
      status,
      failureSummary: {
        step: currentStep,
        message: error?.message ?? 'Unknown failure',
      },
    });
    throw error;
  } finally {
    clearInterval(heartbeat);
    await writeReport(status);
    await writeRunManifest({
      runRoot: outDir,
      casRoot: path.join('artifacts', 'cas'),
      category: 'ga-verify',
      sha,
      toolVersions: {
        node: process.version,
        pnpm: process.env.npm_config_user_agent ?? null,
      },
      policyHashes: {
        verification_map: await maybeHash('docs/ga/verification-map.json'),
        cas_spec: await maybeHash('docs/ga/CAS_ARTIFACTS.md'),
      },
    });
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
