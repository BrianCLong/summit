import { CONTEXT_PACKS } from '../context_packs';

describe('domestic context pack', () => {
  it('defines domestic prior and spotlight indicators', () => {
    expect(CONTEXT_PACKS.domestic.prior).toBe(2);
    expect(CONTEXT_PACKS.domestic.spotlightIndicators).toContain('TA_CTX_001');
  });
});
