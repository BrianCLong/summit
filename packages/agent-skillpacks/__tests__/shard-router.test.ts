import { selectShard } from '../src/shard-router.js';

describe('shard router', () => {
  it('prefers CI shard in ci mode', () => {
    const selection = selectShard({ default: [], ci: [], deep: [] }, { governanceMode: 'ci' });
    expect(selection.shard).toBe('ci');
    expect(selection.reasons[0]).toMatch(/CI/);
  });

  it('falls back to default shard', () => {
    const selection = selectShard({ default: [], deep: [] }, { taskType: 'review' });
    expect(selection.shard).toBe('default');
  });
});
