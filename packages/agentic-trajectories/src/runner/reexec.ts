import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { ToolResult } from '../schema.js';

export interface ReexecutionOptions {
  workspaceRoot: string;
  runDirectory?: string;
  commands?: Array<{ command: string; args?: string[] }>;
  allowUnsafeCommands?: boolean;
  timeoutMs?: number;
}

const SAFE_COMMANDS = ['npm', 'pnpm', 'yarn', 'node'];

function withinWorkspace(workspaceRoot: string, requested: string): boolean {
  const resolved = path.resolve(workspaceRoot, requested);
  const normalizedRoot = path.resolve(workspaceRoot);
  return resolved.startsWith(normalizedRoot);
}

function sanitizeCommand(command: string, allowUnsafe: boolean): void {
  if (allowUnsafe) return;
  if (!SAFE_COMMANDS.includes(command)) {
    throw new Error(`Command ${command} is not allowed in safe mode`);
  }
}

export async function reexecute(
  options: ReexecutionOptions,
): Promise<{ results: ToolResult[]; skipped: boolean }> {
  const workspaceRoot = options.workspaceRoot;
  const runDirectory = options.runDirectory ? options.runDirectory : '.';

  if (!withinWorkspace(workspaceRoot, runDirectory)) {
    throw new Error('Run directory must be within workspace');
  }

  const absoluteDir = path.resolve(workspaceRoot, runDirectory);
  if (!existsSync(absoluteDir)) {
    throw new Error(`Run directory does not exist: ${absoluteDir}`);
  }

  if (options.commands && options.commands.length === 0) {
    return { results: [], skipped: true };
  }

  const commands =
    options.commands && options.commands.length > 0
      ? options.commands
      : [{ command: 'npm', args: ['test', '--', '--runInBand'] }];

  const results: ToolResult[] = [];

  for (const [index, cmd] of commands.entries()) {
    sanitizeCommand(cmd.command, Boolean(options.allowUnsafeCommands));
    const toolResult = await runCommand(
      cmd.command,
      cmd.args ?? [],
      absoluteDir,
      options.timeoutMs,
    );
    results.push({
      call_id: `reexec-${index}`,
      ok: toolResult.ok,
      stdout: toolResult.stdout,
      stderr: toolResult.stderr,
      ts: new Date().toISOString(),
      artifacts: { exitCode: toolResult.code },
    });
  }

  return { results, skipped: false };
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = 120000,
): Promise<{ ok: boolean; stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        child.kill('SIGKILL');
        resolve({
          ok: false,
          stdout,
          stderr: `${stderr}\nTimed out`,
          code: null,
        });
      }
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout, stderr, code });
    });
  });
}
