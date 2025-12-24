import { merge } from '../../src/crdt';

describe('crdt', () => {
  it('lww merge prefers newer', () => {
    const a = { x: { value: 1, ts: 1 } } as any;
    const b = { x: { value: 2, ts: 2 } } as any;
    expect(merge(a, b).x.value).toBe(2);
  });
});
