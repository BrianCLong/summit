import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createContextShell } from '../../libs/context-shell/node/index.js';

describe('context shell', () => {
  async function makeTempDir() {
    return fs.mkdtemp(path.join(os.tmpdir(), 'context-shell-'));
  }

  it('blocks non-allowlisted commands', async () => {
    const root = await makeTempDir();
    const shell = createContextShell({
      root,
      evidence: { enabled: false },
      now: () => 1,
    });

    const result = await shell.bash('rm -rf .');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Policy denied/);
  });

  it('denies access to .env paths', async () => {
    const root = await makeTempDir();
    await fs.writeFile(path.join(root, '.env'), 'SECRET=1', 'utf8');

    const shell = createContextShell({
      root,
      evidence: { enabled: false },
      now: () => 1,
    });

    const result = await shell.readFile('.env');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/path-denied:env-file/);
  });

  it('returns deterministic ls output', async () => {
    const root = await makeTempDir();
    await fs.writeFile(path.join(root, 'b.txt'), 'b', 'utf8');
    await fs.writeFile(path.join(root, 'a.txt'), 'a', 'utf8');

    const shell = createContextShell({
      root,
      evidence: { enabled: false },
      now: () => 5,
    });

    const result = await shell.bash('ls');

    expect(result.stdout).toBe('a.txt\nb.txt');
    expect(result.exitCode).toBe(0);
  });

  it('allows intercept hooks to rewrite paths and outputs', async () => {
    const root = await makeTempDir();
    await fs.writeFile(path.join(root, 'actual.txt'), 'hooked', 'utf8');

    const shell = createContextShell({
      root,
      evidence: { enabled: false },
      now: () => 10,
      hooks: {
        onBeforeCall: (call) =>
          call.tool === 'ctx.readFile'
            ? { ...call, path: 'actual.txt' }
            : call,
        onAfterCall: (_call, result) => ({
          ...result,
          stdout: result.stdout.toUpperCase(),
        }),
      },
    });

    const result = await shell.readFile('ignored.txt');

    expect(result.stdout).toBe('HOOKED');
    expect(result.exitCode).toBe(0);
  });
});
