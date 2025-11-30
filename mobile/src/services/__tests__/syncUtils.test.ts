import { batchesNeeded, summarizeStatus } from '../syncUtils';

describe('batchesNeeded', () => {
  it('returns zero for empty queue', () => {
    expect(batchesNeeded(0, 10)).toBe(0);
  });

  it('rounds up for partial batch', () => {
    expect(batchesNeeded(11, 10)).toBe(2);
  });
});

describe('summarizeStatus', () => {
  it('formats status summary with defaults', () => {
    expect(summarizeStatus('idle')).toBe('idle|queue:0|last:never');
  });

  it('includes last sync timestamp and queue', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    expect(summarizeStatus('running', date, 5)).toBe('running|queue:5|last:2024-01-01T00:00:00.000Z');
  });
});
