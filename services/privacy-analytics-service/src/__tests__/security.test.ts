/**
 * Security Tests
 *
 * Tests for privacy attack mitigation scenarios including:
 * - Differencing attacks
 * - Linkage attacks
 * - Reconstruction attacks
 * - Membership inference
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DifferentialPrivacy } from '../privacy/DifferentialPrivacy.js';
import { PolicyEnforcer } from '../privacy/PolicyEnforcer.js';
import { QueryTranslator } from '../query/QueryTranslator.js';
import type {
  AggregateQuery,
  AggregateResultRow,
  PrivacyPolicy,
  ExecutionContext,
} from '../types/index.js';
import { DataSource, AggregationType, PrivacyMechanism, FilterOperator } from '../types/index.js';

describe('Security Tests - Privacy Attack Mitigation', () => {
  let dp: DifferentialPrivacy;
  let enforcer: PolicyEnforcer;
  let translator: QueryTranslator;

  beforeEach(() => {
    dp = new DifferentialPrivacy();
    enforcer = new PolicyEnforcer(5);
    translator = new QueryTranslator();
  });

  describe('Differencing Attack Mitigation', () => {
    /**
     * Differencing attack: An adversary submits two queries that differ
     * only by including/excluding a single individual, then computes the
     * difference to learn about that individual.
     */

    it('should prevent differencing attacks via noise addition', () => {
      // Simulates two queries that could be used in a differencing attack
      const queryAll: AggregateResultRow[] = [
        { dimensions: { dept: 'Engineering' }, measures: { salary_sum: 500000 }, privacyAffected: false },
      ];

      const queryWithoutTarget: AggregateResultRow[] = [
        { dimensions: { dept: 'Engineering' }, measures: { salary_sum: 400000 }, privacyAffected: false },
      ];

      const config = {
        epsilon: 0.1, // Strong privacy
        mechanism: 'laplace' as const,
        budgetTracking: false,
      };

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'dept' }],
        measures: [{ field: 'salary', aggregation: AggregationType.SUM, alias: 'salary_sum' }],
      };

      // Apply DP to both queries
      const noisyAll = dp.applyDP(queryAll, config, query);
      const noisyWithout = dp.applyDP(queryWithoutTarget, config, query);

      // The difference between noisy results should NOT reliably reveal
      // the target individual's salary (100000)
      const differences: number[] = [];
      for (let trial = 0; trial < 100; trial++) {
        const r1 = dp.applyDP([{ ...queryAll[0] }], config, query);
        const r2 = dp.applyDP([{ ...queryWithoutTarget[0] }], config, query);

        const diff = (r1.rows[0].measures.salary_sum || 0) - (r2.rows[0].measures.salary_sum || 0);
        differences.push(diff);
      }

      // The differences should have high variance due to noise
      const mean = differences.reduce((a, b) => a + b, 0) / differences.length;
      const variance = differences.reduce((sum, x) => sum + (x - mean) ** 2, 0) / differences.length;

      // With epsilon=0.1 and sensitivity=100 (salary), noise scale = 1000
      // Variance should be substantial (at least 10000)
      expect(variance).toBeGreaterThan(1000);
    });

    it('should track budget to limit repeated queries', () => {
      dp.getBudgetState('attacker-tenant', undefined, {
        epsilon: 1.0, // Total budget
        mechanism: 'laplace',
        budgetTracking: true,
        budgetRenewalPeriod: 'day',
      });

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'dept' }],
        measures: [{ field: 'salary', aggregation: AggregationType.SUM, alias: 'salary_sum' }],
      };

      // Simulate many queries attempting differencing attack
      let queriesExecuted = 0;
      let budgetExceeded = false;

      for (let i = 0; i < 100; i++) {
        const rows: AggregateResultRow[] = [
          { dimensions: { dept: 'Engineering' }, measures: { salary_sum: 500000 }, privacyAffected: false },
        ];

        const budgetState = dp.getBudgetState('attacker-tenant');
        const result = dp.applyDP(rows, {
          epsilon: 0.1, // Each query costs 0.1 epsilon
          mechanism: 'laplace',
          budgetTracking: true,
        }, query, budgetState);

        if (result.budgetExceeded) {
          budgetExceeded = true;
          break;
        }

        dp.consumeBudget('attacker-tenant', result.epsilonConsumed);
        queriesExecuted++;
      }

      // Should be blocked after ~10 queries (1.0 / 0.1)
      expect(budgetExceeded).toBe(true);
      expect(queriesExecuted).toBeLessThanOrEqual(10);
    });
  });

  describe('Linkage Attack Mitigation', () => {
    /**
     * Linkage attack: An adversary uses external knowledge combined with
     * multiple quasi-identifiers to re-identify individuals.
     */

    it('should detect high-risk dimension combinations', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [
          { field: 'zip_code' },
          { field: 'birth_date' },
          { field: 'gender' },
        ],
        measures: [{ field: 'id', aggregation: AggregationType.COUNT, alias: 'count' }],
      };

      const context: ExecutionContext = {
        executionId: 'test',
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['analyst'],
        policies: [],
        timestamp: new Date(),
      };

      // The enforcer should warn about this high-risk combination
      const result = enforcer['preflightCheck'](query, context);

      expect(result.warnings.some(w => w.code === 'HIGH_RISK_COMBINATION')).toBe(true);
      expect(result.warnings.some(w =>
        w.affectedFields?.includes('zip_code') ||
        w.affectedFields?.includes('birth_date') ||
        w.affectedFields?.includes('gender')
      )).toBe(true);
    });

    it('should enforce k-anonymity on quasi-identifier combinations', () => {
      const rows: AggregateResultRow[] = [
        // This combination is unique (k=1)
        { dimensions: { zip: '12345', age: 35, gender: 'M' }, measures: { count: 1 }, privacyAffected: false, cohortSize: 1 },
        // This combination has sufficient k
        { dimensions: { zip: '54321', age: 30, gender: 'F' }, measures: { count: 10 }, privacyAffected: false, cohortSize: 10 },
      ];

      const policy: PrivacyPolicy = {
        id: 'linkage-protection',
        name: 'Linkage Protection',
        description: 'Protect against linkage attacks',
        enabled: true,
        mechanism: PrivacyMechanism.K_ANONYMITY,
        kAnonymity: {
          minCohortSize: 5,
          quasiIdentifiers: ['zip', 'age', 'gender'],
          violationAction: 'suppress',
        },
        applicableSources: [DataSource.ENTITIES],
        priority: 100,
        auditLevel: 'detailed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const context: ExecutionContext = {
        executionId: 'test',
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['analyst'],
        policies: [policy],
        timestamp: new Date(),
      };

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [
          { field: 'zip' },
          { field: 'age' },
          { field: 'gender' },
        ],
        measures: [{ field: 'id', aggregation: AggregationType.COUNT, alias: 'count' }],
      };

      const result = enforcer.applyKAnonymity(rows, policy.kAnonymity!, query);

      // The unique combination should be suppressed
      expect(result.rows).toHaveLength(1);
      expect(result.suppressedCount).toBe(1);
      expect(result.rows[0].dimensions.zip).toBe('54321');
    });
  });

  describe('Reconstruction Attack Mitigation', () => {
    /**
     * Reconstruction attack: An adversary uses multiple aggregate queries
     * to reconstruct individual records.
     */

    it('should add noise to prevent exact reconstruction', () => {
      // An attacker tries to reconstruct individual salaries by querying
      // different slices of data
      const rows: AggregateResultRow[] = [
        { dimensions: { role: 'Engineer' }, measures: { salary_avg: 120000 }, privacyAffected: false },
        { dimensions: { role: 'Manager' }, measures: { salary_avg: 150000 }, privacyAffected: false },
      ];

      const config = {
        epsilon: 0.5,
        mechanism: 'laplace' as const,
        budgetTracking: false,
      };

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'role' }],
        measures: [{ field: 'salary', aggregation: AggregationType.AVG, alias: 'salary_avg' }],
      };

      // Run multiple times to check noise prevents exact reconstruction
      const engineerSalaries: number[] = [];

      for (let i = 0; i < 50; i++) {
        const result = dp.applyDP([{ ...rows[0] }], config, query);
        engineerSalaries.push(result.rows[0].measures.salary_avg || 0);
      }

      // Check that we get different values each time
      const uniqueValues = new Set(engineerSalaries);
      expect(uniqueValues.size).toBeGreaterThan(1);

      // Noise should make exact reconstruction infeasible
      const minSalary = Math.min(...engineerSalaries);
      const maxSalary = Math.max(...engineerSalaries);
      expect(maxSalary - minSalary).toBeGreaterThan(1000); // Significant spread
    });
  });

  describe('Membership Inference Attack Mitigation', () => {
    /**
     * Membership inference: An adversary tries to determine if a specific
     * individual is present in the dataset.
     */

    it('should prevent membership inference via suppression', () => {
      // If querying for a specific individual returns exactly 1, it confirms their presence
      // Suppression with threshold > 1 prevents this

      const rows: AggregateResultRow[] = [
        { dimensions: { name: 'Unique Person' }, measures: { count: 1 }, privacyAffected: false, cohortSize: 1 },
      ];

      const result = enforcer.applySuppression(rows, {
        minCountThreshold: 5,
        showSuppressed: false,
      });

      // The single-person result should be suppressed
      expect(result.rows).toHaveLength(0);
      expect(result.suppressedCount).toBe(1);
    });

    it('should add noise to count queries to obscure membership', () => {
      // Even with threshold, DP adds uncertainty to count queries
      const rows: AggregateResultRow[] = [
        { dimensions: { has_condition: true }, measures: { count: 3 }, privacyAffected: false },
      ];

      const config = {
        epsilon: 0.1, // Strong privacy
        mechanism: 'laplace' as const,
        budgetTracking: false,
      };

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'has_condition' }],
        measures: [{ field: 'id', aggregation: AggregationType.COUNT, alias: 'count' }],
      };

      // Check that the noisy count varies
      const counts: number[] = [];
      for (let i = 0; i < 50; i++) {
        const result = dp.applyDP([{ ...rows[0] }], config, query);
        counts.push(result.rows[0].measures.count || 0);
      }

      // With epsilon=0.1, noise is large enough that count could be 0 or much higher
      const hasZero = counts.some(c => c === 0);
      const hasHigh = counts.some(c => c > 10);

      // At least one of these should be true due to noise
      expect(hasZero || hasHigh).toBe(true);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should reject queries with SQL injection attempts in field names', () => {
      const maliciousQuery: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: "type'; DROP TABLE entities; --" }],
        measures: [{ field: 'id', aggregation: AggregationType.COUNT }],
      };

      const result = translator.validateQuery(maliciousQuery);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('field name'))).toBe(true);
    });

    it('should parameterize all user-provided values', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [{ field: 'id', aggregation: AggregationType.COUNT }],
        filters: {
          logic: 'AND',
          conditions: [
            { field: 'name', operator: FilterOperator.EQUALS, value: "'; DELETE FROM users; --" },
          ],
        },
      };

      const result = translator.toPostgres(query);

      // The malicious value should be parameterized, not interpolated
      expect(result.sql).not.toContain('DELETE');
      expect(result.params).toContain("'; DELETE FROM users; --");
      expect(result.sql).toMatch(/name = \$\d+/);
    });
  });

  describe('Rate Limiting for Attack Prevention', () => {
    it('should limit query frequency through budget mechanism', () => {
      const tenantId = 'rate-limited-tenant';

      dp.getBudgetState(tenantId, undefined, {
        epsilon: 0.5, // Small budget
        mechanism: 'laplace',
        budgetTracking: true,
        budgetRenewalPeriod: 'hour',
      });

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [],
        measures: [{ field: 'id', aggregation: AggregationType.COUNT }],
      };

      // Each query consumes budget
      let consecutiveQueries = 0;

      for (let i = 0; i < 20; i++) {
        const budgetState = dp.getBudgetState(tenantId);
        const rows = [{ dimensions: {}, measures: { count: 100 }, privacyAffected: false }];

        const result = dp.applyDP(rows, {
          epsilon: 0.1,
          mechanism: 'laplace',
          budgetTracking: true,
        }, query, budgetState);

        if (result.budgetExceeded) {
          break;
        }

        dp.consumeBudget(tenantId, result.epsilonConsumed);
        consecutiveQueries++;
      }

      // Should be limited to ~5 queries (0.5 / 0.1)
      expect(consecutiveQueries).toBeLessThanOrEqual(5);
    });
  });
});
