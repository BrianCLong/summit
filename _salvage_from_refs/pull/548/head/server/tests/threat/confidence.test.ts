import { band } from '../../src/threat/confidence';

describe('confidence band', () => {
  it('returns Low', () => {
    expect(band(0.1)).toBe('Low');
  });
  it('returns Medium', () => {
    expect(band(0.5)).toBe('Medium');
  });
  it('returns High', () => {
    expect(band(0.9)).toBe('High');
  });
});
