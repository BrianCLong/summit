/// <reference types="node" />
import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { evaluateTerminalBenchPro, fetchTerminalBenchTasks } from '../src/evaluators/terminalBenchPro.js';

describe('Terminal Bench Pro fetcher', () => {
  it('paginates dataset rows', async () => {
    const client = {
      get: jest
        .fn()
        .mockResolvedValueOnce({ data: { rows: [{ row: { id: '1', instruction: 'do', command: 'echo hi' } }] }, headers: { etag: 'rev1' } })
        .mockResolvedValueOnce({ data: { rows: [] }, headers: {} }),
    } as unknown as typeof axios;
    const { tasks, revision } = await fetchTerminalBenchTasks(1, client);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].command).toBe('echo hi');
    expect(revision).toBe('rev1');
  });
});

describe('Terminal Bench Pro evaluator', () => {
  it('writes deterministic report', async () => {
    const outDir = path.join(os.tmpdir(), 'tbp-report');
    const client = {
      get: jest
        .fn()
        .mockResolvedValueOnce({ data: { rows: [{ row: { id: '1', instruction: 'noop' } }] }, headers: { etag: 'rev2' } })
        .mockResolvedValueOnce({ data: { rows: [] }, headers: {} }),
    } as unknown as typeof axios;
    const result = await evaluateTerminalBenchPro({
      limit: 1,
      outDir,
      requireDocker: false,
      sandboxOptions: { cmd: ['true'] },
      client,
    });
    expect(result.tasks[0].status).toBe('skipped');
    const summary = JSON.parse(await fs.promises.readFile(path.join(outDir, 'summary.json'), 'utf-8'));
    expect(summary.datasetRevision).toBe('rev2');
  });
});
