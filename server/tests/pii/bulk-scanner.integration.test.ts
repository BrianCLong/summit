import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { BulkScanner } from '../../src/pii/scanner.js';
import type { ClassificationEngine } from '../../src/pii/classifier.js';

class NoopClassificationEngine {
  async classify(): Promise<any> {
    return { entities: [], summary: { entities: 0, byType: {} }, stats: {} };
  }
}

describe('BulkScanner walk handling', () => {
  it('handles deeply nested records without recursion blowup', async () => {
    let value: unknown = 'leaf-value';
    for (let i = 0; i < 1500; i += 1) {
      value = { [`level-${i}`]: value };
    }

    const scanner = new BulkScanner(
      new NoopClassificationEngine() as unknown as ClassificationEngine,
    );

    const report = await scanner.scan(
      [
        {
          id: 'deep',
          value,
          tableName: 'deep_record',
          schema: { name: 'deep', fields: [] },
        },
      ],
      { includeUnchanged: true },
    );

    expect(report.results).toHaveLength(1);
    expect(report.results[0].detected).toHaveLength(0);
    expect(report.results[0].changed).toBe(true);
  });
});

