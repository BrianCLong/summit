import { LocalMemoryProvider } from '../src/providers/localMemoryProvider.js';
import { MemoryAddInput } from '../src/types.js';

const baseInput: Omit<MemoryAddInput, 'content' | 'type'> = {
  tenantId: 't1',
  userId: 'u1',
  scope: 'project',
  projectId: 'p1',
};

describe('LocalMemoryProvider search ranking', () => {
  it('honors threshold and recency boost', async () => {
    const provider = new LocalMemoryProvider();
    await provider.addMemory({ ...baseInput, type: 'project-config', content: 'This project uses Bun for builds' });
    const older = await provider.addMemory({
      ...baseInput,
      type: 'conversation',
      content: 'We once mentioned npm',
    });
    older.createdAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60);

    const results = await provider.searchMemories({
      query: 'bun build command',
      tenantId: 't1',
      userId: 'u1',
      scope: 'project',
      projectId: 'p1',
      threshold: 0.1,
    });

    expect(results.length).toBe(1);
    expect(results[0].record.content).toContain('Bun');
  });
});
