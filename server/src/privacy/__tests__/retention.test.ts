import { buildDerivedPolicies, getRetentionTierDefinition, resetRetentionPackCache } from '../retention';
import { resetPrivacyEntityCache } from '../entities';

describe('retention policy pack integration', () => {
  beforeEach(() => {
    resetRetentionPackCache();
    resetPrivacyEntityCache();
  });

  it('builds derived policies using pack tiers', () => {
    const policies = buildDerivedPolicies();
    const userPolicy = policies.find(policy => policy.tableName === 'users');
    const auditPolicy = policies.find(policy => policy.tableName === 'audit_logs');

    expect(userPolicy).toBeDefined();
    expect(userPolicy?.retentionDays).toBe(30);
    expect(userPolicy?.action).toBe('anonymize');
    expect(userPolicy?.retentionTier).toBe('short-30d');
    expect(userPolicy?.subjectKey).toBe('id');

    expect(auditPolicy).toBeDefined();
    expect(auditPolicy?.retentionDays).toBe(30);
    expect(auditPolicy?.action).toBe('delete');
    expect(auditPolicy?.retentionTier).toBe('short-30d');
  });

  it('returns tier definitions from policy pack', () => {
    const tier = getRetentionTierDefinition('short-30d');
    expect(tier).toBeDefined();
    expect(tier?.days).toBe(30);
    expect(tier?.action).toBe('delete');
  });
});
