import { llmUsageService } from '../src/services/LLMUsageService.js';

jest.mock('../src/db/postgres.js', () => ({
  getPostgresPool: () => ({
    query: jest.fn().mockResolvedValue({}),
  }),
}));

describe('LLMUsageService', () => {
  it('logs interaction to database', async () => {
    const { getPostgresPool } = await import('../src/db/postgres.js');
    const pool = getPostgresPool();
    await llmUsageService.logInteraction({
      userId: 'user1',
      model: 'gpt-4o',
      prompt: 'Hello',
      promptStructure: { type: 'test' },
    });
    expect(pool.query).toHaveBeenCalled();
  });
});
