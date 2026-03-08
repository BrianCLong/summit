/**
 * Policy Evaluator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEvaluator } from '../evaluator/policy-evaluator';
import { PolicyBundle, Authority, License } from '../schema/policy.schema';

describe('PolicyEvaluator', () => {
  let evaluator: PolicyEvaluator;
  let testBundle: PolicyBundle;

  beforeEach(() => {
    testBundle = {
      version: '1.0.0',
      authorities: [
        {
          id: 'auth-analyst',
          name: 'Analyst Read Access',
          subjects: { roles: ['analyst'] },
          permissions: [
            {
              action: 'read',
              resource: 'entity',
              fields: ['name', 'type', 'description'],
            },
          ],
          resources: {
            entityTypes: ['Person', 'Organization'],
            classifications: ['UNCLASSIFIED', 'CONFIDENTIAL'],
          },
        },
        {
          id: 'auth-admin',
          name: 'Admin Full Access',
          subjects: { roles: ['admin'] },
          permissions: [
            { action: 'create', resource: '*' },
            { action: 'read', resource: '*' },
            { action: 'update', resource: '*' },
            { action: 'delete', resource: '*' },
          ],
          resources: {},
        },
      ],
      licenses: [
        {
          id: 'lic-basic',
          name: 'Basic License',
          features: ['read', 'search'],
          limits: {
            maxEntities: 10000,
            maxQueries: 1000,
            maxExports: 10,
          },
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2025-12-31'),
        },
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
    };

    evaluator = new PolicyEvaluator(testBundle);
  });

  describe('Authority Evaluation', () => {
    it('should allow analyst to read Person entity', () => {
      const result = evaluator.evaluate({
        subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
        action: 'read',
        resource: {
          type: 'entity',
          entityType: 'Person',
          classification: 'UNCLASSIFIED',
        },
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny analyst write access', () => {
      const result = evaluator.evaluate({
        subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
        action: 'create',
        resource: { type: 'entity', entityType: 'Person' },
      });

      expect(result.allowed).toBe(false);
    });

    it('should allow admin full access', () => {
      const result = evaluator.evaluate({
        subject: { userId: 'admin1', roles: ['admin'], tenantId: 'tenant1' },
        action: 'delete',
        resource: { type: 'entity', entityType: 'Asset' },
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny access to higher classification', () => {
      const result = evaluator.evaluate({
        subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
        action: 'read',
        resource: {
          type: 'entity',
          entityType: 'Person',
          classification: 'TOP_SECRET',
        },
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe('License Evaluation', () => {
    it('should check feature access', () => {
      const result = evaluator.checkLicense('lic-basic', 'read');
      expect(result.allowed).toBe(true);
    });

    it('should enforce entity limits', () => {
      const result = evaluator.checkLicenseLimits('lic-basic', {
        entityCount: 15000,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('maxEntities');
    });

    it('should check license expiration', () => {
      const expiredBundle: PolicyBundle = {
        ...testBundle,
        licenses: [
          {
            id: 'lic-expired',
            name: 'Expired License',
            features: ['read'],
            limits: {},
            validFrom: new Date('2020-01-01'),
            validTo: new Date('2021-12-31'),
          },
        ],
      };

      const expiredEvaluator = new PolicyEvaluator(expiredBundle);
      const result = expiredEvaluator.checkLicense('lic-expired', 'read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('expired');
    });
  });

  describe('Field-Level Access', () => {
    it('should allow access to permitted fields', () => {
      const result = evaluator.checkFieldAccess({
        subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
        resource: { type: 'entity', entityType: 'Person' },
        fields: ['name', 'type'],
      });

      expect(result.allowed).toBe(true);
      expect(result.allowedFields).toEqual(['name', 'type']);
    });

    it('should deny access to restricted fields', () => {
      const result = evaluator.checkFieldAccess({
        subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
        resource: { type: 'entity', entityType: 'Person' },
        fields: ['name', 'ssn', 'classification'],
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedFields).toContain('ssn');
      expect(result.deniedFields).toContain('classification');
    });
  });

  describe('Audit Trail', () => {
    it('should record evaluation decisions', () => {
      evaluator.evaluate({
        subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
        action: 'read',
        resource: { type: 'entity', entityType: 'Person' },
      });

      const auditLog = evaluator.getAuditLog();
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].action).toBe('read');
      expect(auditLog[0].decision).toBe('allowed');
    });
  });
});
