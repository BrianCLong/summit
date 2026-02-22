import { selectShard } from '../src/shard-router.js';

describe('shard router', () => {
  it('prefers CI shard in ci mode', () => {
    const selection = selectShard({ default: [], ci: [], deep: [] }, { governanceMode: 'ci' });
    expect(selection.shard).toBe('ci');
    expect(selection.reasons[0]).toMatch(/CI/);
  });

  it('routes deep shard for high intent depth order', () => {
    const selection = selectShard(
      { default: [], deep: [], review: [] },
      { intentDepthOrder: 23 }
    );
    expect(selection.shard).toBe('deep');
    expect(selection.reasons[0]).toMatch(/Intent depth order/);
  });

  it('falls back to default shard', () => {
    const selection = selectShard({ default: [], deep: [] }, { taskType: 'review' });
    expect(selection.shard).toBe('default');
  });
});
