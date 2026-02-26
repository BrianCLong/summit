
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ResidencyGuard } from '../ResidencyGuard';

describe('ResidencyGuard', () => {
  let guard: ResidencyGuard;

  beforeEach(() => {
    guard = new ResidencyGuard({
      allowedRegions: ['us-east-1', 'eu-central-1'],
      strictMode: true
    });
  });

  it('should allow access from compatible regions', () => {
    expect(guard.checkAccess('us-east-1', 'us-east-1')).toBe(true);
  });

  it('should deny cross-region access in strict mode', () => {
    expect(guard.checkAccess('us-east-1', 'eu-central-1')).toBe(false);
  });

  it('should validate storage regions', () => {
    expect(guard.validateStorage('us-east-1')).toBe(true);
    expect(guard.validateStorage('ap-south-1')).toBe(false);
  });
});
