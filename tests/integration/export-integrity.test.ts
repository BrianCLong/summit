import { createHash } from 'crypto';

describe('Export integrity placeholder', () => {
  it('produces deterministic hashes for the same payload', () => {
    const payload = JSON.stringify({ id: 'export-1', records: 3 });
    const hashA = createHash('sha256').update(payload).digest('hex');
    const hashB = createHash('sha256').update(payload).digest('hex');
    expect(hashA).toBe(hashB);
  });
});
