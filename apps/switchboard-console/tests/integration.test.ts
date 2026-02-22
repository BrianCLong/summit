import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ConsoleSession } from '../src/session/ConsoleSession';
import { FakeAdapter } from '../src/adapters/FakeAdapter';


describe('console session integration', () => {
  it('streams deterministic output and logs events', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'switchboard-'));
    const repoRoot = path.resolve(__dirname, '../../..');
    const skillsetDir = path.join(repoRoot, '.summit', 'skillsets');

    const session = new ConsoleSession({
      sessionRoot: tempRoot,
      skillsetDir,
      adapters: [new FakeAdapter()],
    });

    await session.init();
    await session.handleInput('/agent fake');
    await session.handleInput('/skillset senior-swe');
    const response = await session.handleInput('hello');

    expect(response).toContain('RESPONSE:ok');

    const eventsPath = path.join(tempRoot, session.id, 'events.jsonl');
    const events = await readFile(eventsPath, 'utf-8');
    expect(events).toContain('session_start');
    expect(events).toContain('tool_exec');
  });
});
