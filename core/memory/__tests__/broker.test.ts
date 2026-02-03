import { MemoryBroker } from '../broker';
import { InMemoryMemoryStorage } from '../storage_memory';
import { MemoryRecord, MemoryScope } from '../types';

describe('Memory Broker', () => {
  let broker: MemoryBroker;
  let storage: InMemoryMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryMemoryStorage();
    broker = new MemoryBroker(storage);
  });

  const future = Date.now() + 10000;

  test('should store and retrieve a valid record', async () => {
    const record: Omit<MemoryRecord, 'createdAt'> = {
      id: 'mem1',
      userId: 'user123',
      content: 'I like apples',
      facets: { preference: 'apples' },
      purpose: 'assist',
      contextSpace: 'personal',
      sources: ['chat'],
      expiresAt: future,
      visibility: 'user',
    };

    await broker.remember(record);

    const scope: MemoryScope = { userId: 'user123', purpose: 'assist', contextSpace: 'personal' };
    const retrieved = await broker.retrieve('mem1', scope);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.content).toBe('I like apples');
  });

  test('should return null when retrieving with wrong scope', async () => {
    const record: Omit<MemoryRecord, 'createdAt'> = {
      id: 'mem2',
      userId: 'user123',
      content: 'I work at Acme',
      facets: { job: 'Acme' },
      purpose: 'assist',
      contextSpace: 'work',
      sources: ['chat'],
      expiresAt: future,
      visibility: 'user',
    };

    await broker.remember(record);

    const wrongScope: MemoryScope = { userId: 'user123', purpose: 'assist', contextSpace: 'personal' };
    const retrieved = await broker.retrieve('mem2', wrongScope);

    expect(retrieved).toBeNull();
  });
});
