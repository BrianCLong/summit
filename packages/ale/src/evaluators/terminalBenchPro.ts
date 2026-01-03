import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import { runInSandbox, SandboxOptions } from '../sandbox.js';
import { TrajectoryRecorder } from '../trajectory.js';

export interface TerminalBenchTask {
  id: string;
  instruction: string;
  command?: string;
  archive?: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluationOptions {
  limit?: number;
  outDir?: string;
  sandboxOptions?: Partial<SandboxOptions>;
  requireDocker?: boolean;
  client?: AxiosInstance;
}

export interface EvaluationResult {
  tasks: TaskReport[];
  datasetRevision?: string;
}

export interface TaskReport {
  id: string;
  status: 'skipped' | 'executed' | 'failed';
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  notes?: string;
}

const DATASET_API = 'https://datasets-server.huggingface.co';

export async function fetchTerminalBenchTasks(
  limit = 10,
  client: AxiosInstance = axios,
): Promise<{ tasks: TerminalBenchTask[]; revision?: string }> {
  const tasks: TerminalBenchTask[] = [];
  let offset = 0;
  let revision: string | undefined;

  while (tasks.length < limit) {
    const remaining = limit - tasks.length;
    const response = await client.get(
      `${DATASET_API}/rows?dataset=alibabagroup/terminal-bench-pro&config=default&split=train&offset=${offset}&length=${Math.min(
        remaining,
        100,
      )}`,
    );
    revision = revision ?? response.headers?.etag;
    const rows: any[] = response.data?.rows ?? [];
    if (rows.length === 0) break;
    for (const row of rows) {
      if (!row?.row) continue;
      const parsed: TerminalBenchTask = {
        id: row.row.id?.toString() ?? `task-${offset}`,
        instruction: row.row.instruction ?? row.row.prompt ?? 'Task with no instruction',
        command: row.row.command ?? row.row.run ?? undefined,
        archive: row.row.archive ?? undefined,
        metadata: row.row,
      };
      tasks.push(parsed);
      if (tasks.length >= limit) break;
    }
    offset += rows.length;
  }

  return { tasks, revision };
}

export async function evaluateTerminalBenchPro(options: EvaluationOptions = {}): Promise<EvaluationResult> {
  const { limit = 5, outDir = 'reports/terminal-bench-pro', sandboxOptions = {}, requireDocker, client } = options;
  const { tasks, revision } = await fetchTerminalBenchTasks(limit, client ?? axios);
  await fs.promises.mkdir(outDir, { recursive: true });
  const reports: TaskReport[] = [];

  for (const task of tasks) {
    const recorder = new TrajectoryRecorder({ filePath: path.join(outDir, `${task.id}.jsonl`) });
    await recorder.init();
    if (!task.command) {
      reports.push({ id: task.id, status: 'skipped', notes: 'No command provided by dataset row' });
      continue;
    }

    const commandParts = task.command.split(' ').filter((part: string) => part.length > 0);
    const baseSandbox: SandboxOptions = {
      cmd: commandParts,
      recorder,
      requireDocker,
      ...sandboxOptions,
    } as SandboxOptions;

    if (task.archive) {
      const archivePath = path.join(outDir, `${task.id}.tgz`);
      await fs.promises.writeFile(archivePath, Buffer.from(task.archive, 'base64'));
      baseSandbox.cmd = ['tar', '-xzf', `/workspace/${path.basename(archivePath)}`, '-C', '/tmp'];
      baseSandbox.workdir = process.cwd();
    }

    try {
      const result = await runInSandbox(baseSandbox);
      reports.push({
        id: task.id,
        status: result.exitCode === 0 ? 'executed' : 'failed',
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reports.push({ id: task.id, status: 'skipped', notes: message });
    }
  }

  const aggregatePath = path.join(outDir, 'summary.json');
  await fs.promises.writeFile(
    aggregatePath,
    JSON.stringify({ tasks: reports, datasetRevision: revision, generated_at: new Date().toISOString() }, null, 2),
  );

  return { tasks: reports, datasetRevision: revision };
}
