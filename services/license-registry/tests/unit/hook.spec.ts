import { canExport } from '../../src/hook';

describe('license hook', () => {
  it('denies restricted', () => {
    const r = canExport([
      { id: 'ds1', name: 'Restricted', terms: { export: 'deny' } },
    ], 'ds1');
    expect(r.allowed).toBe(false);
  });
});
