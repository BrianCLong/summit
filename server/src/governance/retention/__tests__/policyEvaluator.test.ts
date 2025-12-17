import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { PolicyEvaluator } from '../policyEvaluator.js';
import { DataRetentionRepository } from '../repository.js';
import {
  RedactionPolicy,
  ResourceReference,
  PolicyEvaluationContext,
  RetentionRecord,
  DatasetMetadata,
  AppliedRetentionPolicy,
} from '../types.js';

describe('PolicyEvaluator', () => {
  let pool: Pool;
  let repository: DataRetentionRepository;
  let evaluator: PolicyEvaluator;

  beforeEach(() => {
    pool = {
      query: jest.fn(),
    } as any;

    repository = new DataRetentionRepository(pool);
    evaluator = new PolicyEvaluator({ pool, repository });
  });

  describe('getEffectivePolicy', () => {
    it('should return effective policy for a dataset resource', async () => {
      // Setup
      const datasetMetadata: DatasetMetadata = {
        datasetId: 'test-dataset-1',
        name: 'Test Dataset',
        dataType: 'analytics',
        containsPersonalData: true,
        jurisdictions: ['EU', 'US'],
        tags: ['pii', 'analytics'],
        storageSystems: ['postgres'],
        owner: 'test-user',
        createdAt: new Date(),
      };

      const appliedPolicy: AppliedRetentionPolicy = {
        datasetId: 'test-dataset-1',
        templateId: 'gdpr-compliant',
        retentionDays: 90,
        purgeGraceDays: 30,
        legalHoldAllowed: true,
        storageTargets: ['postgres'],
        classificationLevel: 'restricted',
        safeguards: ['encryption', 'access-control'],
        appliedAt: new Date(),
        appliedBy: 'system',
      };

      const record: RetentionRecord = {
        metadata: datasetMetadata,
        policy: appliedPolicy,
        archiveHistory: [],
        lastEvaluatedAt: new Date(),
      };

      // Mock repository to return the record
      jest.spyOn(repository, 'getRecord').mockReturnValue(record);

      const resource: ResourceReference = {
        resourceType: 'dataset',
        resourceId: 'test-dataset-1',
        storageSystems: ['postgres'],
      };

      const context: PolicyEvaluationContext = {
        dataClassification: 'restricted',
        jurisdictions: ['EU'],
      };

      // Execute
      const effectivePolicy = await evaluator.getEffectivePolicy(
        resource,
        context,
      );

      // Assert
      expect(effectivePolicy).toBeDefined();
      expect(effectivePolicy.retention.retentionDays).toBe(90);
      expect(effectivePolicy.retention.purgeGraceDays).toBe(30);
      expect(effectivePolicy.appliedPolicies).toHaveLength(1);
      expect(effectivePolicy.appliedPolicies[0].policyId).toBe(
        'gdpr-compliant',
      );
    });

    it('should include legal hold status when active', async () => {
      const datasetMetadata: DatasetMetadata = {
        datasetId: 'test-dataset-2',
        name: 'Test Dataset with Hold',
        dataType: 'communications',
        containsPersonalData: true,
        jurisdictions: ['US'],
        tags: [],
        storageSystems: ['postgres'],
        owner: 'test-user',
        createdAt: new Date(),
      };

      const appliedPolicy: AppliedRetentionPolicy = {
        datasetId: 'test-dataset-2',
        templateId: 'standard',
        retentionDays: 365,
        purgeGraceDays: 30,
        legalHoldAllowed: true,
        storageTargets: ['postgres'],
        classificationLevel: 'confidential',
        safeguards: [],
        appliedAt: new Date(),
        appliedBy: 'system',
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const record: RetentionRecord = {
        metadata: datasetMetadata,
        policy: appliedPolicy,
        legalHold: {
          datasetId: 'test-dataset-2',
          reason: 'Litigation hold',
          requestedBy: 'legal-team',
          createdAt: new Date(),
          expiresAt: futureDate,
          scope: 'full',
        },
        archiveHistory: [],
        lastEvaluatedAt: new Date(),
      };

      jest.spyOn(repository, 'getRecord').mockReturnValue(record);

      const resource: ResourceReference = {
        resourceType: 'dataset',
        resourceId: 'test-dataset-2',
        storageSystems: ['postgres'],
      };

      const context: PolicyEvaluationContext = {};

      // Execute
      const effectivePolicy = await evaluator.getEffectivePolicy(
        resource,
        context,
      );

      // Assert
      expect(effectivePolicy.legalHold).toBeDefined();
      expect(effectivePolicy.legalHold?.active).toBe(true);
      expect(effectivePolicy.legalHold?.reason).toBe('Litigation hold');
      expect(effectivePolicy.warnings).toContain(
        'Legal hold is active - deletion and redaction are blocked',
      );
    });

    it('should apply multiple redaction policies based on triggers', async () => {
      const redactionPolicy1: RedactionPolicy = {
        id: 'policy-1',
        name: 'EU PII Redaction',
        description: 'Redact PII for EU jurisdiction',
        enabled: true,
        triggers: {
          jurisdictions: ['EU'],
          dataClassification: ['restricted'],
        },
        rules: [
          {
            id: 'rule-1',
            fieldPattern: 'email',
            operation: 'hash',
            storageTargets: ['postgres'],
            keepHashStub: true,
          },
        ],
        priority: 100,
        createdAt: new Date(),
        createdBy: 'admin',
      };

      const redactionPolicy2: RedactionPolicy = {
        id: 'policy-2',
        name: 'General PII Masking',
        description: 'Mask all PII fields',
        enabled: true,
        triggers: {
          dataClassification: ['restricted', 'confidential'],
        },
        rules: [
          {
            id: 'rule-2',
            fieldPattern: 'ssn',
            operation: 'mask',
            storageTargets: ['postgres'],
          },
        ],
        priority: 50,
        createdAt: new Date(),
        createdBy: 'admin',
      };

      await evaluator.registerRedactionPolicy(redactionPolicy1);
      await evaluator.registerRedactionPolicy(redactionPolicy2);

      const resource: ResourceReference = {
        resourceType: 'dataset',
        resourceId: 'test-dataset-3',
        storageSystems: ['postgres'],
      };

      const context: PolicyEvaluationContext = {
        dataClassification: 'restricted',
        jurisdictions: ['EU'],
      };

      // Execute
      const effectivePolicy = await evaluator.getEffectivePolicy(
        resource,
        context,
      );

      // Assert
      expect(effectivePolicy.redaction).toBeDefined();
      expect(effectivePolicy.redaction?.policies).toHaveLength(2);
      expect(effectivePolicy.redaction?.policies[0].id).toBe('policy-1'); // Higher priority first
      expect(effectivePolicy.redaction?.policies[1].id).toBe('policy-2');
      expect(effectivePolicy.redaction?.rules).toHaveLength(2);
    });

    it('should not apply disabled redaction policies', async () => {
      const disabledPolicy: RedactionPolicy = {
        id: 'disabled-policy',
        name: 'Disabled Policy',
        description: 'This should not apply',
        enabled: false,
        triggers: {
          dataClassification: ['restricted'],
        },
        rules: [],
        priority: 100,
        createdAt: new Date(),
        createdBy: 'admin',
      };

      await evaluator.registerRedactionPolicy(disabledPolicy);

      const resource: ResourceReference = {
        resourceType: 'dataset',
        resourceId: 'test-dataset-4',
        storageSystems: ['postgres'],
      };

      const context: PolicyEvaluationContext = {
        dataClassification: 'restricted',
      };

      // Execute
      const effectivePolicy = await evaluator.getEffectivePolicy(
        resource,
        context,
      );

      // Assert
      expect(effectivePolicy.redaction?.policies).toHaveLength(0);
    });

    it('should filter redaction rules by storage system', async () => {
      const policy: RedactionPolicy = {
        id: 'multi-storage-policy',
        name: 'Multi-Storage Policy',
        description: 'Rules for different storage systems',
        enabled: true,
        triggers: {
          dataClassification: ['restricted'],
        },
        rules: [
          {
            id: 'pg-rule',
            fieldPattern: 'email',
            operation: 'hash',
            storageTargets: ['postgres'],
          },
          {
            id: 'neo4j-rule',
            fieldPattern: 'name',
            operation: 'anonymize',
            storageTargets: ['neo4j'],
          },
          {
            id: 's3-rule',
            fieldPattern: 'content',
            operation: 'delete',
            storageTargets: ['s3'],
          },
        ],
        priority: 100,
        createdAt: new Date(),
        createdBy: 'admin',
      };

      await evaluator.registerRedactionPolicy(policy);

      const resource: ResourceReference = {
        resourceType: 'dataset',
        resourceId: 'test-dataset-5',
        storageSystems: ['postgres'], // Only postgres
      };

      const context: PolicyEvaluationContext = {
        dataClassification: 'restricted',
      };

      // Execute
      const effectivePolicy = await evaluator.getEffectivePolicy(
        resource,
        context,
      );

      // Assert
      expect(effectivePolicy.redaction?.policies).toHaveLength(1);
      expect(effectivePolicy.redaction?.rules).toHaveLength(1);
      expect(effectivePolicy.redaction?.rules[0].id).toBe('pg-rule');
    });
  });

  describe('Redaction Policy Management', () => {
    it('should register a new redaction policy', async () => {
      const policy: RedactionPolicy = {
        id: 'test-policy-1',
        name: 'Test Policy',
        description: 'Test description',
        enabled: true,
        triggers: {
          dataClassification: ['restricted'],
        },
        rules: [],
        priority: 50,
        createdAt: new Date(),
        createdBy: 'admin',
      };

      await evaluator.registerRedactionPolicy(policy);

      const retrieved = evaluator.getRedactionPolicy('test-policy-1');
      expect(retrieved).toEqual(policy);
    });

    it('should update an existing redaction policy', async () => {
      const policy: RedactionPolicy = {
        id: 'test-policy-2',
        name: 'Original Name',
        description: 'Original description',
        enabled: true,
        triggers: {},
        rules: [],
        priority: 50,
        createdAt: new Date(),
        createdBy: 'admin',
      };

      await evaluator.registerRedactionPolicy(policy);

      const updated = await evaluator.updateRedactionPolicy('test-policy-2', {
        name: 'Updated Name',
        description: 'Updated description',
        priority: 100,
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
      expect(updated.priority).toBe(100);
      expect(updated.updatedAt).toBeDefined();
    });

    it('should delete a redaction policy', async () => {
      const policy: RedactionPolicy = {
        id: 'test-policy-3',
        name: 'To Be Deleted',
        description: 'This will be deleted',
        enabled: true,
        triggers: {},
        rules: [],
        priority: 50,
        createdAt: new Date(),
        createdBy: 'admin',
      };

      await evaluator.registerRedactionPolicy(policy);
      expect(evaluator.getRedactionPolicy('test-policy-3')).toBeDefined();

      await evaluator.deleteRedactionPolicy('test-policy-3');
      expect(evaluator.getRedactionPolicy('test-policy-3')).toBeUndefined();
    });

    it('should list all redaction policies', async () => {
      const policy1: RedactionPolicy = {
        id: 'list-policy-1',
        name: 'Policy 1',
        description: 'First policy',
        enabled: true,
        triggers: {},
        rules: [],
        priority: 50,
        createdAt: new Date(),
        createdBy: 'admin',
      };

      const policy2: RedactionPolicy = {
        id: 'list-policy-2',
        name: 'Policy 2',
        description: 'Second policy',
        enabled: true,
        triggers: {},
        rules: [],
        priority: 100,
        createdAt: new Date(),
        createdBy: 'admin',
      };

      await evaluator.registerRedactionPolicy(policy1);
      await evaluator.registerRedactionPolicy(policy2);

      const policies = evaluator.listRedactionPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(2);
      expect(policies.some((p) => p.id === 'list-policy-1')).toBe(true);
      expect(policies.some((p) => p.id === 'list-policy-2')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle resource with no matching retention record', async () => {
      jest.spyOn(repository, 'getRecord').mockReturnValue(undefined);
      jest.spyOn(repository, 'getAllRecords').mockReturnValue([]);

      const resource: ResourceReference = {
        resourceType: 'dataset',
        resourceId: 'nonexistent',
        storageSystems: ['postgres'],
      };

      const context: PolicyEvaluationContext = {};

      const effectivePolicy = await evaluator.getEffectivePolicy(
        resource,
        context,
      );

      // Should return default retention
      expect(effectivePolicy.retention.retentionDays).toBe(365);
      expect(effectivePolicy.retention.purgeGraceDays).toBe(30);
    });

    it('should handle expired legal hold', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const record: RetentionRecord = {
        metadata: {
          datasetId: 'test-dataset',
          name: 'Test',
          dataType: 'analytics',
          containsPersonalData: false,
          jurisdictions: [],
          tags: [],
          storageSystems: ['postgres'],
          owner: 'test',
          createdAt: new Date(),
        },
        policy: {
          datasetId: 'test-dataset',
          templateId: 'standard',
          retentionDays: 365,
          purgeGraceDays: 30,
          legalHoldAllowed: true,
          storageTargets: ['postgres'],
          classificationLevel: 'internal',
          safeguards: [],
          appliedAt: new Date(),
          appliedBy: 'system',
        },
        legalHold: {
          datasetId: 'test-dataset',
          reason: 'Expired hold',
          requestedBy: 'legal',
          createdAt: pastDate,
          expiresAt: pastDate,
          scope: 'full',
        },
        archiveHistory: [],
        lastEvaluatedAt: new Date(),
      };

      jest.spyOn(repository, 'getRecord').mockReturnValue(record);

      const resource: ResourceReference = {
        resourceType: 'dataset',
        resourceId: 'test-dataset',
        storageSystems: ['postgres'],
      };

      const context: PolicyEvaluationContext = {};

      const effectivePolicy = await evaluator.getEffectivePolicy(
        resource,
        context,
      );

      // Expired hold should not be active
      expect(effectivePolicy.legalHold).toBeUndefined();
    });
  });
});
