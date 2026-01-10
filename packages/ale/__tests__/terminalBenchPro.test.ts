import fs from 'fs';
import os from 'os';
import path from 'path';
import { evaluateTerminalBenchPro, fetchTerminalBenchTasks } from '../src/evaluators/terminalBenchPro.js';

describe('Terminal Bench Pro fetcher', () => {
  it('paginates dataset rows', async () => {
    const fetcher = jest
      .fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ rows: [{ row: { id: '1', instruction: 'do', command: 'echo hi' } }] }), {
          status: 200,
          headers: { etag: 'rev1' },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ rows: [] }), { status: 200 }));
    const { tasks, revision } = await fetchTerminalBenchTasks(1, fetcher);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].command).toBe('echo hi');
    expect(revision).toBe('rev1');
  });
});

describe('Terminal Bench Pro evaluator', () => {
  it('writes deterministic report', async () => {
    const outDir = path.join(os.tmpdir(), 'tbp-report');
    const fetcher = jest
      .fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ rows: [{ row: { id: '1', instruction: 'noop' } }] }), {
          status: 200,
          headers: { etag: 'rev2' },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ rows: [] }), { status: 200 }));
    const result = await evaluateTerminalBenchPro({
      limit: 1,
      outDir,
      requireDocker: false,
      sandboxOptions: { cmd: ['true'] },
      fetcher,
      now: () => new Date('2026-01-01T00:00:00Z'),
    });
    expect(result.tasks[0].status).toBe('skipped');
    const summary = JSON.parse(await fs.promises.readFile(path.join(outDir, 'summary.json'), 'utf-8'));
    expect(summary.datasetRevision).toBe('rev2');
    expect(summary.generated_at).toBe('2026-01-01T00:00:00.000Z');
  });
});
