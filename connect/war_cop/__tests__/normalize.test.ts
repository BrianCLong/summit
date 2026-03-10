import { describe, it } from "node:test";
import * as assert from "node:assert";
const expect = (actual) => ({ toBe: (expected) => assert.strictEqual(actual, expected), toContain: (expected) => assert.ok(actual.includes(expected)) });

import { normalizeRecord } from '../normalize';

describe('normalizeRecord', () => {
  it('normalizes a record', () => {
    const raw = {
      source: 'test',
      collected_at: '2023-01-01',
      external_id: '123',
      body: 'test body',
    };
    const normalized = normalizeRecord(raw);
    expect(normalized.id).toBe('EVID:WARCOP:test:123');
  });
});
