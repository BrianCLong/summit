import fs from 'fs';
import path from 'path';
import { isDockerAvailable, runInSandbox, SandboxOptions } from '../sandbox.js';
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
  fetcher?: typeof fetch;
  now?: () => Date;
}

export interface EvaluationResult {
  tasks: TaskReport[];
  datasetRevision?: string;
  dockerAvailable: boolean;
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
  fetcher: typeof fetch = globalThis.fetch,
): Promise<{ tasks: TerminalBenchTask[]; revision?: string }> {
  const resolvedFetcher = fetcher ?? globalThis.fetch;
  if (!resolvedFetcher) {
    throw new Error('Global fetch is unavailable; provide a fetcher implementation');
  }
  const tasks: TerminalBenchTask[] = [];
  let offset = 0;
  let revision: string | undefined;

  while (tasks.length < limit) {
    const remaining = limit - tasks.length;
    const response = await resolvedFetcher(
      `${DATASET_API}/rows?dataset=alibabagroup/terminal-bench-pro&config=default&split=train&offset=${offset}&length=${Math.min(
        remaining,
        100,
      )}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset rows: ${response.status}`);
    }
    revision = revision ?? response.headers.get('etag') ?? undefined;
    const data = await response.json();
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    if (rows.length === 0) break;
    for (const row of rows as Array<{ row?: Record<string, unknown> }>) {
      if (!row?.row) continue;
      const parsed: TerminalBenchTask = {
        id: row.row.id ? String(row.row.id) : `task-${offset}`,
        instruction:
          typeof row.row.instruction === 'string'
            ? row.row.instruction
            : typeof row.row.prompt === 'string'
              ? row.row.prompt
              : 'Task with no instruction',
        command:
          typeof row.row.command === 'string'
            ? row.row.command
            : typeof row.row.run === 'string'
              ? row.row.run
              : undefined,
        archive: typeof row.row.archive === 'string' ? row.row.archive : undefined,
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
  const {
    limit = 5,
    outDir = 'reports/terminal-bench-pro',
    sandboxOptions = {},
    requireDocker,
    fetcher,
    now,
  } = options;
  const { tasks, revision } = await fetchTerminalBenchTasks(limit, fetcher ?? globalThis.fetch);
  await fs.promises.mkdir(outDir, { recursive: true });
  const reports: TaskReport[] = [];
  const dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable && requireDocker) {
    throw new Error('Docker is required but not available on this host');
  }

  for (const task of tasks) {
    const recorder = new TrajectoryRecorder({ filePath: path.join(outDir, `${task.id}.jsonl`) });
    await recorder.init();
    if (!dockerAvailable) {
      reports.push({ id: task.id, status: 'skipped', notes: 'Docker not available' });
      continue;
    }
    if (!task.command) {
      reports.push({ id: task.id, status: 'skipped', notes: 'No command provided by dataset row' });
      continue;
    }

    let commandScript = task.command;

    if (task.archive) {
      const archivePath = path.join(outDir, `${task.id}.tgz`);
      await fs.promises.writeFile(archivePath, Buffer.from(task.archive, 'base64'));
      commandScript = `tar -xzf /workspace/${path.basename(archivePath)} -C /tmp && cd /tmp && ${commandScript}`;
    }

    try {
      const result = await runInSandbox({
        ...sandboxOptions,
        recorder,
        requireDocker,
        cmd: ['sh', '-lc', commandScript],
      });
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
    JSON.stringify(
      {
        tasks: reports,
        datasetRevision: revision,
        generated_at: (now ?? (() => new Date()))().toISOString(),
      },
      null,
      2,
    ),
  );

  return { tasks: reports, datasetRevision: revision, dockerAvailable };
}
