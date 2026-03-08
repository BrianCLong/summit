import { validatePolicy, DEFAULT_POLICY } from '../src/policy';

describe('UI Automation Policy', () => {
  it('should validate default policy', () => {
    expect(validatePolicy(DEFAULT_POLICY)).toBe(true);
  });
});
