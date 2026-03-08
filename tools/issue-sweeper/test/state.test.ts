import { describe, test } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { initState, loadState, saveState } from '../src/state.js';

describe('state helpers', () => {
  test('loadState resets when state_filter changes', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'issue-sweeper-'));
    const stateFile = path.join(tempDir, 'STATE.json');
    const initial = initState('BrianCLong/summit', 'all', 50);
    await saveState(stateFile, initial);

    const loaded = await loadState(
      stateFile,
      'BrianCLong/summit',
      'open',
      50,
      false,
    );

    assert.strictEqual(loaded.state_filter, 'open');
    assert.strictEqual(loaded.cursor.page, 1);
    assert.strictEqual(loaded.processed_count, 0);
  });

  test('loadState preserves state when config is unchanged', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'issue-sweeper-'));
    const stateFile = path.join(tempDir, 'STATE.json');
    const initial = initState('BrianCLong/summit', 'all', 50);
    initial.cursor.page = 9;
    initial.processed_count = 123;
    await saveState(stateFile, initial);

    const loaded = await loadState(
      stateFile,
      'BrianCLong/summit',
      'all',
      50,
      false,
    );

    assert.strictEqual(loaded.cursor.page, 9);
    assert.strictEqual(loaded.processed_count, 123);
  });
});
