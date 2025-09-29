import { policy } from '../../server/src/services/policy';

describe('Policy Assertions', () => {
  // Test case: Unauthorized user
  test('should throw unauthorized error if user is null', () => {
    expect(() => policy.assert(null, ['some:scope'], {})).toThrow('unauthorized');
  });

  // Test case: Case membership
  test('should allow access if user is a member of the case', () => {
    const user = { cases: ['case123'] };
    const ctx = { args: { caseId: 'case123' } };
    expect(() => policy.assert(user, ['case:read'], ctx)).not.toThrow();
  });

  test('should deny access if user is not a member of the case', () => {
    const user = { cases: ['case456'] };
    const ctx = { args: { caseId: 'case123' } };
    expect(() => policy.assert(user, ['case:read'], ctx)).toThrow('forbidden: not a member of this case');
  });

  // Test cases for classification levels
  const classificationLevels: { [key: string]: number } = {
    "PUBLIC": 0,
    "CONFIDENTIAL": 1,
    "RESTRICTED": 2,
    "SECRET": 3,
    "TS": 4,
    "TS-SCI": 5
  };

  Object.keys(classificationLevels).forEach(level => {
    test(`should allow access for user with ${level} classification to ${level} scope`, () => {
      const user = { classification: level };
      expect(() => policy.assert(user, [`classification:${level}`], {})).not.toThrow();
    });

    test(`should allow access for user with higher classification than ${level} to ${level} scope`, () => {
      const userClassificationIndex = classificationLevels[level];
      if (userClassificationIndex < Object.keys(classificationLevels).length - 1) {
        const higherLevel = Object.keys(classificationLevels)[userClassificationIndex + 1];
        const user = { classification: higherLevel };
        expect(() => policy.assert(user, [`classification:${level}`], {})).not.toThrow();
      }
    });

    test(`should deny access for user with lower classification than ${level} to ${level} scope`, () => {
      const userClassificationIndex = classificationLevels[level];
      if (userClassificationIndex > 0) {
        const lowerLevel = Object.keys(classificationLevels)[userClassificationIndex - 1];
        const user = { classification: lowerLevel };
        expect(() => policy.assert(user, [`classification:${level}`], {})).toThrow(`forbidden: insufficient classification (${lowerLevel.toLowerCase()} < ${level})`);
      }
    });
  });

  test('should deny access if user has no classification and scope requires one', () => {
    const user = {};
    expect(() => policy.assert(user, ['classification:SECRET'], {})).toThrow('forbidden: insufficient classification (none < SECRET)');
  });

  // Test case: Tenant mismatch
  test('should allow access if tenant matches', () => {
    const user = { tenantId: 'tenantA' };
    const ctx = { args: { tenantId: 'tenantA' } };
    expect(() => policy.assert(user, ['tenant:match'], ctx)).not.toThrow();
  });

  test('should deny access if tenant mismatches', () => {
    const user = { tenantId: 'tenantA' };
    const ctx = { args: { tenantId: 'tenantB' } };
    expect(() => policy.assert(user, ['tenant:match'], ctx)).toThrow('forbidden: tenant mismatch');
  });

  test('should allow access if tenant:match scope is present but no targetTenantId in args', () => {
    const user = { tenantId: 'tenantA' };
    const ctx = { args: {} };
    expect(() => policy.assert(user, ['tenant:match'], ctx)).not.toThrow();
  });
});