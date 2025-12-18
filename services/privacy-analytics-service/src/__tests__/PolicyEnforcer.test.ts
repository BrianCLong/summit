/**
 * Policy Enforcer Tests
 *
 * Tests for k-anonymity, suppression, and generalization enforcement.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PolicyEnforcer } from '../privacy/PolicyEnforcer.js';
import type {
  AggregateResultRow,
  AggregateQuery,
  KAnonymityConfig,
  SuppressionConfig,
  GeneralizationConfig,
  PrivacyPolicy,
  ExecutionContext,
} from '../types/index.js';
import { DataSource, AggregationType, PrivacyMechanism, QueryStatus } from '../types/index.js';

describe('PolicyEnforcer', () => {
  let enforcer: PolicyEnforcer;

  beforeEach(() => {
    enforcer = new PolicyEnforcer(5);
  });

  describe('K-Anonymity Enforcement', () => {
    const baseQuery: AggregateQuery = {
      source: DataSource.ENTITIES,
      dimensions: [{ field: 'type' }],
      measures: [
        { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
      ],
    };

    it('should suppress rows with cohort size below k', () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false, cohortSize: 100 },
        { dimensions: { type: 'vehicle' }, measures: { count: 3 }, privacyAffected: false, cohortSize: 3 },
        { dimensions: { type: 'location' }, measures: { count: 50 }, privacyAffected: false, cohortSize: 50 },
      ];

      const config: KAnonymityConfig = {
        minCohortSize: 5,
        violationAction: 'suppress',
      };

      const result = enforcer.applyKAnonymity(rows, config, baseQuery);

      expect(result.rows).toHaveLength(2);
      expect(result.suppressedCount).toBe(1);
      expect(result.rows.find(r => r.dimensions.type === 'vehicle')).toBeUndefined();
    });

    it('should pass all rows when cohort sizes are sufficient', () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false, cohortSize: 100 },
        { dimensions: { type: 'vehicle' }, measures: { count: 50 }, privacyAffected: false, cohortSize: 50 },
        { dimensions: { type: 'location' }, measures: { count: 25 }, privacyAffected: false, cohortSize: 25 },
      ];

      const config: KAnonymityConfig = {
        minCohortSize: 5,
        violationAction: 'suppress',
      };

      const result = enforcer.applyKAnonymity(rows, config, baseQuery);

      expect(result.rows).toHaveLength(3);
      expect(result.suppressedCount).toBe(0);
    });

    it('should use count measure when cohortSize not provided', () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false },
        { dimensions: { type: 'vehicle' }, measures: { count: 2 }, privacyAffected: false },
      ];

      const config: KAnonymityConfig = {
        minCohortSize: 5,
        violationAction: 'suppress',
      };

      const result = enforcer.applyKAnonymity(rows, config, baseQuery);

      expect(result.rows).toHaveLength(1);
      expect(result.suppressedCount).toBe(1);
    });

    it('should generate warning on violation', () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { type: 'person' }, measures: { count: 3 }, privacyAffected: false, cohortSize: 3 },
      ];

      const config: KAnonymityConfig = {
        minCohortSize: 5,
        violationAction: 'error',
      };

      const result = enforcer.applyKAnonymity(rows, config, baseQuery);

      expect(result.warnings.some(w => w.code === 'K_ANONYMITY_VIOLATION')).toBe(true);
    });
  });

  describe('Suppression Enforcement', () => {
    it('should suppress rows below count threshold', () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false },
        { dimensions: { type: 'vehicle' }, measures: { count: 2 }, privacyAffected: false },
        { dimensions: { type: 'location' }, measures: { count: 10 }, privacyAffected: false },
      ];

      const config: SuppressionConfig = {
        minCountThreshold: 5,
        showSuppressed: false,
      };

      const result = enforcer.applySuppression(rows, config);

      expect(result.rows).toHaveLength(2);
      expect(result.suppressedCount).toBe(1);
    });

    it('should show suppressed rows with placeholder when configured', () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false },
        { dimensions: { type: 'vehicle' }, measures: { count: 2 }, privacyAffected: false },
      ];

      const config: SuppressionConfig = {
        minCountThreshold: 5,
        showSuppressed: true,
        suppressedPlaceholder: -1,
      };

      const result = enforcer.applySuppression(rows, config);

      expect(result.rows).toHaveLength(2);
      expect(result.suppressedCount).toBe(1);

      const vehicleRow = result.rows.find(r => r.dimensions.type === 'vehicle');
      expect(vehicleRow?.measures.count).toBe(-1);
      expect(vehicleRow?.privacyAffected).toBe(true);
    });

    it('should use null as placeholder when not specified', () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { type: 'vehicle' }, measures: { count: 2 }, privacyAffected: false },
      ];

      const config: SuppressionConfig = {
        minCountThreshold: 5,
        showSuppressed: true,
      };

      const result = enforcer.applySuppression(rows, config);

      expect(result.rows[0].measures.count).toBeNull();
    });
  });

  describe('Generalization Enforcement', () => {
    it('should generalize values according to hierarchy', () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { location: 'New York' }, measures: { count: 100 }, privacyAffected: false },
        { dimensions: { location: 'Los Angeles' }, measures: { count: 50 }, privacyAffected: false },
        { dimensions: { location: 'Chicago' }, measures: { count: 30 }, privacyAffected: false },
      ];

      const config: GeneralizationConfig = {
        hierarchies: {
          location: [
            ['New York', 'Northeast', 'USA', '*'],
            ['Los Angeles', 'West', 'USA', '*'],
            ['Chicago', 'Midwest', 'USA', '*'],
          ],
        },
        targetLevel: 2, // Generalize to country level
      };

      const result = enforcer.applyGeneralization(rows, config);

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].dimensions.location).toBe('USA');
      expect(result.rows[1].dimensions.location).toBe('USA');
      expect(result.rows[2].dimensions.location).toBe('USA');
      expect(result.rows[0].privacyAffected).toBe(true);
    });

    it('should leave values unchanged if not in hierarchy', () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { location: 'Unknown City' }, measures: { count: 100 }, privacyAffected: false },
      ];

      const config: GeneralizationConfig = {
        hierarchies: {
          location: [
            ['New York', 'Northeast', 'USA', '*'],
          ],
        },
        targetLevel: 2,
      };

      const result = enforcer.applyGeneralization(rows, config);

      expect(result.rows[0].dimensions.location).toBe('Unknown City');
    });

    it('should generate warning when generalization applied', () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { age: '25' }, measures: { count: 100 }, privacyAffected: false },
      ];

      const config: GeneralizationConfig = {
        hierarchies: {
          age: [
            ['25', '20-29', '18-35', '*'],
          ],
        },
        targetLevel: 1,
      };

      const result = enforcer.applyGeneralization(rows, config);

      expect(result.warnings.some(w => w.code === 'GENERALIZATION_APPLIED')).toBe(true);
      expect(result.rows[0].dimensions.age).toBe('20-29');
    });
  });

  describe('Full Policy Enforcement', () => {
    it('should apply multiple policies in priority order', async () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false, cohortSize: 100 },
        { dimensions: { type: 'vehicle' }, measures: { count: 3 }, privacyAffected: false, cohortSize: 3 },
        { dimensions: { type: 'location' }, measures: { count: 50 }, privacyAffected: false, cohortSize: 50 },
      ];

      const policies: PrivacyPolicy[] = [
        {
          id: 'policy-1',
          name: 'K-Anonymity',
          description: 'Test k-anonymity policy',
          enabled: true,
          mechanism: PrivacyMechanism.K_ANONYMITY,
          kAnonymity: {
            minCohortSize: 5,
            violationAction: 'suppress',
          },
          applicableSources: [DataSource.ENTITIES],
          priority: 100,
          auditLevel: 'summary',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const context: ExecutionContext = {
        executionId: 'test-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['analyst'],
        policies,
        timestamp: new Date(),
      };

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
      };

      const result = await enforcer.enforce({
        query,
        context,
        rawResults: rows,
      });

      expect(result.rows).toHaveLength(2);
      expect(result.suppressedCount).toBe(1);
      expect(result.status).toBe(QueryStatus.PARTIAL);
      expect(result.appliedPolicies).toContain('policy-1');
    });

    it('should return SUPPRESSED status when all rows filtered', async () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { type: 'rare' }, measures: { count: 1 }, privacyAffected: false, cohortSize: 1 },
        { dimensions: { type: 'unique' }, measures: { count: 2 }, privacyAffected: false, cohortSize: 2 },
      ];

      const policies: PrivacyPolicy[] = [
        {
          id: 'strict-policy',
          name: 'Strict K-Anonymity',
          description: 'Strict policy',
          enabled: true,
          mechanism: PrivacyMechanism.K_ANONYMITY,
          kAnonymity: {
            minCohortSize: 10,
            violationAction: 'suppress',
          },
          applicableSources: [DataSource.ENTITIES],
          priority: 100,
          auditLevel: 'summary',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const context: ExecutionContext = {
        executionId: 'test-456',
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['analyst'],
        policies,
        timestamp: new Date(),
      };

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
      };

      const result = await enforcer.enforce({
        query,
        context,
        rawResults: rows,
      });

      expect(result.rows).toHaveLength(0);
      expect(result.status).toBe(QueryStatus.SUPPRESSED);
      expect(result.warnings.some(w => w.code === 'ALL_ROWS_SUPPRESSED')).toBe(true);
    });

    it('should skip disabled policies', async () => {
      const rows: AggregateResultRow[] = [
        { dimensions: { type: 'person' }, measures: { count: 2 }, privacyAffected: false, cohortSize: 2 },
      ];

      const policies: PrivacyPolicy[] = [
        {
          id: 'disabled-policy',
          name: 'Disabled Policy',
          description: 'Should be skipped',
          enabled: false, // Disabled
          mechanism: PrivacyMechanism.K_ANONYMITY,
          kAnonymity: {
            minCohortSize: 10,
            violationAction: 'suppress',
          },
          applicableSources: [DataSource.ENTITIES],
          priority: 100,
          auditLevel: 'summary',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const context: ExecutionContext = {
        executionId: 'test-789',
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['analyst'],
        policies,
        timestamp: new Date(),
      };

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
      };

      const result = await enforcer.enforce({
        query,
        context,
        rawResults: rows,
      });

      // Disabled policy should not filter the row
      expect(result.rows).toHaveLength(1);
      expect(result.appliedPolicies).not.toContain('disabled-policy');
    });
  });

  describe('Policy Validation', () => {
    it('should validate policy with missing ID', () => {
      const policy = {
        id: '',
        name: 'Test',
        description: 'Test',
        enabled: true,
        mechanism: PrivacyMechanism.K_ANONYMITY,
        applicableSources: [],
        priority: 100,
        auditLevel: 'summary' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = enforcer.validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Policy ID is required');
    });

    it('should validate k-anonymity config', () => {
      const policy: PrivacyPolicy = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        enabled: true,
        mechanism: PrivacyMechanism.K_ANONYMITY,
        kAnonymity: {
          minCohortSize: 0, // Invalid
          violationAction: 'suppress',
        },
        applicableSources: [],
        priority: 100,
        auditLevel: 'summary',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = enforcer.validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('minCohortSize'))).toBe(true);
    });

    it('should pass valid policy', () => {
      const policy: PrivacyPolicy = {
        id: 'valid-policy',
        name: 'Valid Policy',
        description: 'A valid policy',
        enabled: true,
        mechanism: PrivacyMechanism.K_ANONYMITY,
        kAnonymity: {
          minCohortSize: 5,
          violationAction: 'suppress',
        },
        applicableSources: [DataSource.ENTITIES],
        priority: 100,
        auditLevel: 'summary',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = enforcer.validatePolicy(policy);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
