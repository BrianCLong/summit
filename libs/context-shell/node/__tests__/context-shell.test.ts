import * as fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import { createContextShell } from '../index.js';

async function createTempRepo(): Promise<string> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'context-shell-'));
  await fs.writeFile(path.join(base, 'README.md'), 'hello world\n', 'utf8');
  await fs.mkdir(path.join(base, 'config'), { recursive: true });
  await fs.writeFile(path.join(base, 'config', '.env'), 'SECRET=1\n', 'utf8');
  return base;
}

describe('context shell', () => {
  it('blocks disallowed commands', async () => {
    const root = await createTempRepo();
    const ctx = createContextShell({ root, fsMode: 'readonly', now: () => 0 });
    const result = await ctx.bash('rm -rf /');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Command not allowlisted');
  });

  it('denies sensitive paths', async () => {
    const root = await createTempRepo();
    const ctx = createContextShell({ root, fsMode: 'readonly', now: () => 0 });
    const result = await ctx.readFile(path.join(root, 'config', '.env'));
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Path denied');
  });

  it('produces deterministic outputs', async () => {
    const root = await createTempRepo();
    const now = jest.fn(() => 1000);
    const ctx = createContextShell({ root, fsMode: 'readonly', now });
    const result = await ctx.bash('pwd');
    expect(result.stdout.trim()).toBe(root);
    expect(result.durationMs).toBe(0);
  });

  it('supports intercept hooks', async () => {
    const root = await createTempRepo();
    const ctx = createContextShell({
      root,
      fsMode: 'readonly',
      now: () => 0,
      hooks: {
        onBeforeCall: ({ tool, input }) => {
          if (tool === 'bash') {
            return { tool, input: { command: 'pwd' } };
          }
          return { tool, input };
        },
        onAfterCall: (_context, output) => ({
          ...output,
          stdout: `${output.stdout.trim()}!\n`,
        }),
      },
    });
    const result = await ctx.bash('ls');
    expect(result.stdout.trim()).toBe(`${root}!`);
  });

  it('filters denied paths from listings', async () => {
    const root = await createTempRepo();
    const ctx = createContextShell({ root, fsMode: 'readonly', now: () => 0 });
    const result = await ctx.bash('find .');
    expect(result.stdout).not.toContain('.env');
  });

  it('applies patch writes with justification', async () => {
    const root = await createTempRepo();
    const ctx = createContextShell({ root, fsMode: 'overlay', now: () => 0 });
    const patch = `*** Begin Patch\n*** Add File: docs/note.md\n+Hello Summit\n*** End Patch\n`;
    const result = await ctx.writeFile(
      path.join(root, 'docs', 'note.md'),
      patch,
      {
        justification: 'add note',
        format: 'patch',
      },
    );
    expect(result.exitCode).toBe(0);
    const content = await fs.readFile(path.join(root, 'docs', 'note.md'), 'utf8');
    expect(content.trim()).toBe('Hello Summit');
  });
});
