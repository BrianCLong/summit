import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TrajectoryRecorder } from './trajectory.js';
import { TrajectoryStep } from './types.js';

export interface SandboxOptions {
  image?: string;
  cmd: string[];
  workdir?: string;
  network?: 'none' | 'bridge';
  memory?: string;
  cpus?: string;
  recorder?: TrajectoryRecorder;
  allowImages?: string[];
  requireDocker?: boolean;
}

export interface SandboxResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

const DEFAULT_ALLOWLIST = ['debian:stable-slim', 'alpine:latest', 'busybox:latest'];

export async function isDockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const check = spawn('docker', ['info']);
    check.on('exit', (code) => resolve(code === 0));
    check.on('error', () => resolve(false));
  });
}

export async function runInSandbox(options: SandboxOptions): Promise<SandboxResult> {
  const dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable) {
    if (options.requireDocker) {
      throw new Error('Docker is required but not available on this host');
    }
    throw new Error('Docker not available; sandbox execution skipped');
  }

  const image = options.image ?? DEFAULT_ALLOWLIST[0];
  const allowedImages = options.allowImages ?? DEFAULT_ALLOWLIST;
  if (!allowedImages.includes(image)) {
    throw new Error(`Image ${image} is not in the allowlist`);
  }

  const cmdId = randomUUID();
  const recorder = options.recorder;
  const invocationStep: TrajectoryStep = {
    ts: Date.now(),
    role: 'tool',
    kind: 'tool_invocation',
    name: 'sandbox',
    input: options.cmd,
    metadata: { cmd_id: cmdId, image, workdir: options.workdir, network: options.network ?? 'none' },
  };
  if (recorder) {
    await recorder.recordStep(invocationStep);
  }

  const args = buildDockerArgs(options, image);
  const start = Date.now();
  const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on('error', (error) => reject(error));
    child.on('close', (code) => resolve(code));
  });
  const durationMs = Date.now() - start;

  const resultStep: TrajectoryStep = {
    ts: Date.now(),
    role: 'tool',
    kind: 'tool_result',
    name: 'sandbox',
    output: truncate(stdout),
    error: stderr.length > 0 ? truncate(stderr) : undefined,
    duration_ms: durationMs,
    metadata: { cmd_id: cmdId, exit_code: exitCode },
  };
  if (recorder) {
    await recorder.recordStep(resultStep);
  }

  return { exitCode, stdout, stderr, durationMs };
}

function buildDockerArgs(options: SandboxOptions, image: string): string[] {
  const args = ['run', '--rm', '--read-only'];
  const workdir = options.workdir ?? process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ale-sbx-'));
  args.push('-v', `${workdir}:/workspace:ro`);
  args.push('-w', '/workspace');
  args.push('--network', options.network ?? 'none');
  if (options.memory) {
    args.push('--memory', options.memory);
  }
  if (options.cpus) {
    args.push('--cpus', options.cpus);
  }
  args.push('-v', `${tempDir}:/tmp`);
  args.push(image);
  args.push(...options.cmd);
  return args;
}

const truncate = (value: string, limit = 4000): string => {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}...[truncated]`;
};
