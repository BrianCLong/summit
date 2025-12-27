
import { describe, it, expect } from '@jest/globals';
import { LIFECYCLE_POLICIES, TABLE_MAPPINGS, getRetentionDays } from '../../src/lifecycle/policy';

describe('Data Classification & Lifecycle Model', () => {
  it('should have defined policies for all categories', () => {
    expect(LIFECYCLE_POLICIES['OPERATIONAL_METADATA']).toBeDefined();
    expect(LIFECYCLE_POLICIES['ANALYTICS_ARTIFACTS']).toBeDefined();
    expect(LIFECYCLE_POLICIES['PREDICTIVE_MODELS']).toBeDefined();
    expect(LIFECYCLE_POLICIES['AUDIT_RECORDS']).toBeDefined();
    expect(LIFECYCLE_POLICIES['TENANT_DATA']).toBeDefined();
  });

  it('should parse retention periods correctly', () => {
    expect(getRetentionDays('30d')).toBe(30);
    expect(getRetentionDays('1y')).toBe(365);
    expect(getRetentionDays('infinity')).toBe(-1);
  });

  it('should map tables to categories', () => {
    const categories = new Set(TABLE_MAPPINGS.map(m => m.category));
    expect(categories.has('OPERATIONAL_METADATA')).toBe(true);
    expect(categories.has('ANALYTICS_ARTIFACTS')).toBe(true);
  });

  it('should ensure vital audit tables are classified as AUDIT_RECORDS', () => {
      const provMap = TABLE_MAPPINGS.find(m => m.tableName === 'provenance_records');
      expect(provMap?.category).toBe('AUDIT_RECORDS');
  });
});
