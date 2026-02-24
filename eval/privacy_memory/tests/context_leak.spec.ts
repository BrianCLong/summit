import { MemoryBroker } from '../../../core/memory/broker';
import { InMemoryMemoryStorage } from '../../../core/memory/storage_memory';
import { MemoryRecord, MemoryScope } from '../../../core/memory/types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Context Leakage Evaluation', () => {
  let broker: MemoryBroker;
  let storage: InMemoryMemoryStorage;
  const fixturePath = path.join(__dirname, '../fixtures/context_collapse.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  beforeEach(async () => {
    storage = new InMemoryMemoryStorage();
    broker = new MemoryBroker(storage);

    // Load fixtures
    for (const rec of fixture.records) {
      await broker.remember({
        ...rec,
        userId: fixture.userId,
        facets: {},
        sources: ['fixture'],
        expiresAt: Date.now() + 100000,
        visibility: 'user'
      } as MemoryRecord);
    }
  });

  test.each(fixture.leakage_tests)('$name', async (testCase) => {
    const results = await broker.search({ ...testCase.request, userId: fixture.userId } as MemoryScope);
    const resultIds = results.map(r => r.id);

    for (const forbiddenId of testCase.forbidden_ids) {
      expect(resultIds).not.toContain(forbiddenId);
    }
  });

  test('Deny-by-default: empty scope should return nothing', async () => {
    // Note: cast to any to simulate invalid/empty scope if type allows
    const results = await broker.search({} as any);
    expect(results.length).toBe(0);
  });
});
