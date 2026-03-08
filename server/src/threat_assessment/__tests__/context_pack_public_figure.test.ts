import { CONTEXT_PACKS } from '../context_packs';

describe('public_figure context pack', () => {
  it('defines public-figure prior and fixation spotlight', () => {
    expect(CONTEXT_PACKS.public_figure.prior).toBe(1.5);
    expect(CONTEXT_PACKS.public_figure.requiredFamilies).toContain('fixation');
  });
});
