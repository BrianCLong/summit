import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { readCursor, writeCursor } from '../src/reconcile/cursor_store.js';
import { CaptureCursor } from '../src/capture/types.js';

describe('cursorStore', () => {
  const testCursorPath = path.join(process.cwd(), '.test-cursor.json');

  afterEach(async () => {
    try {
      await fs.unlink(testCursorPath);
    } catch {}
  });

  it('should write and read cursor deterministically', async () => {
    const cursor: CaptureCursor = {
      kind: 'wal',
      slot: 'test_slot',
      lsn: '0/16B1908'
    };

    await writeCursor(testCursorPath, cursor);
    const read = await readCursor(testCursorPath);
    expect(read).toEqual(cursor);

    // Verify stable stringification
    const data = await fs.readFile(testCursorPath, 'utf-8');
    const expectedData = JSON.stringify(cursor); // Basic JSON stringify might match for simple objects, but fast-json-stable-stringify ensures it
    expect(data).toBe('{"kind":"wal","lsn":"0/16B1908","slot":"test_slot"}'); // Alphabetical order
  });

  it('should return null if cursor does not exist', async () => {
    const read = await readCursor(path.join(process.cwd(), 'non-existent.json'));
    expect(read).toBeNull();
  });
});
