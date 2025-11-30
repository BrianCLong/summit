import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DataCloneService,
  SyntheticDataGenerator,
  DataAnonymizer,
  PromotionWorkflow,
  CloneStrategy,
  DataSourceType,
  AnonymizationTechnique,
} from '@intelgraph/datalab-service';
import {
  SandboxConfigManager,
  SandboxIsolationLevel,
  TenantType,
} from '@intelgraph/sandbox-tenant-profile';

describe('DataCloneService', () => {
  let cloneService: DataCloneService;
  let manager: SandboxConfigManager;

  beforeEach(async () => {
    cloneService = new DataCloneService();
    manager = new SandboxConfigManager();
  });

  describe('clone', () => {
    it('should clone data with structure-only strategy', async () => {
      const profile = await manager.createProfile(
        { name: 'Clone Test' },
        'user-123',
        'dataLab'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      const result = await cloneService.clone(
        {
          id: 'clone-1',
          sandboxId: profile.id,
          name: 'Schema Clone',
          sourceType: DataSourceType.NEO4J,
          sourceConfig: { database: 'production' },
          strategy: CloneStrategy.STRUCTURE_ONLY,
          requestedBy: 'user-123',
          requestedAt: new Date(),
        },
        activeProfile!
      );

      expect(result.status).toBe('completed');
      expect(result.statistics.clonedRecords).toBe(0); // Structure only
    });

    it('should clone with anonymization', async () => {
      const profile = await manager.createProfile(
        { name: 'Anonymize Test' },
        'user-123',
        'dataLab'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      const result = await cloneService.clone(
        {
          id: 'clone-2',
          sandboxId: profile.id,
          name: 'Anonymized Clone',
          sourceType: DataSourceType.POSTGRESQL,
          sourceConfig: { table: 'users' },
          strategy: CloneStrategy.ANONYMIZED,
          fieldAnonymization: [
            {
              fieldPath: 'email',
              technique: AnonymizationTechnique.HASHING,
              config: { hashAlgorithm: 'sha256' },
            },
            {
              fieldPath: 'ssn',
              technique: AnonymizationTechnique.REDACTION,
              config: {},
            },
            {
              fieldPath: 'name',
              technique: AnonymizationTechnique.PSEUDONYMIZATION,
              config: {},
            },
          ],
          requestedBy: 'user-123',
          requestedAt: new Date(),
        },
        activeProfile!
      );

      expect(result.status).toBe('completed');
      expect(result.audit.anonymizationReport.length).toBeGreaterThan(0);
    });

    it('should clone with sampling', async () => {
      const profile = await manager.createProfile(
        { name: 'Sample Test' },
        'user-123',
        'dataLab'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      const result = await cloneService.clone(
        {
          id: 'clone-3',
          sandboxId: profile.id,
          name: 'Sampled Clone',
          sourceType: DataSourceType.NEO4J,
          sourceConfig: { query: 'MATCH (n:Person) RETURN n' },
          strategy: CloneStrategy.SAMPLED,
          sampleSize: 100,
          sampleMethod: 'random',
          requestedBy: 'user-123',
          requestedAt: new Date(),
        },
        activeProfile!
      );

      expect(result.status).toBe('completed');
      expect(result.statistics.clonedRecords).toBeLessThanOrEqual(100);
    });

    it('should fail clone for suspended sandbox', async () => {
      const profile = await manager.createProfile(
        { name: 'Suspended Test' },
        'user-123'
      );
      await manager.activateProfile(profile.id);
      await manager.suspendProfile(profile.id, 'Test suspension');
      const suspendedProfile = await manager.getProfile(profile.id);

      await expect(
        cloneService.clone(
          {
            id: 'clone-fail',
            sandboxId: profile.id,
            name: 'Should Fail',
            sourceType: DataSourceType.NEO4J,
            sourceConfig: {},
            strategy: CloneStrategy.SYNTHETIC,
            requestedBy: 'user-123',
            requestedAt: new Date(),
          },
          suspendedProfile!
        )
      ).rejects.toThrow();
    });
  });

  describe('validation', () => {
    it('should validate anonymization rules cover PII fields', async () => {
      const profile = await manager.createProfile(
        { name: 'Validation Test' },
        'user-123',
        'dataLab'
      );
      await manager.activateProfile(profile.id);
      const activeProfile = await manager.getProfile(profile.id);

      // Should warn about potentially missing anonymization
      const result = await cloneService.clone(
        {
          id: 'clone-validate',
          sandboxId: profile.id,
          name: 'Validate Clone',
          sourceType: DataSourceType.POSTGRESQL,
          sourceConfig: { table: 'users' },
          strategy: CloneStrategy.ANONYMIZED,
          fieldAnonymization: [], // Empty - no anonymization rules
          requestedBy: 'user-123',
          requestedAt: new Date(),
        },
        activeProfile!
      );

      expect(result.audit.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('DataAnonymizer', () => {
  let anonymizer: DataAnonymizer;

  beforeEach(() => {
    anonymizer = new DataAnonymizer();
  });

  describe('anonymize', () => {
    it('should redact sensitive data', () => {
      const result = anonymizer.anonymize('SSN: 123-45-6789', {
        technique: AnonymizationTechnique.REDACTION,
        config: {},
      });

      expect(result).toBe('[REDACTED]');
    });

    it('should hash data consistently', () => {
      const result1 = anonymizer.anonymize('test@example.com', {
        technique: AnonymizationTechnique.HASHING,
        config: { hashAlgorithm: 'sha256' },
      });
      const result2 = anonymizer.anonymize('test@example.com', {
        technique: AnonymizationTechnique.HASHING,
        config: { hashAlgorithm: 'sha256' },
      });

      expect(result1).toBe(result2);
      expect(result1).not.toBe('test@example.com');
    });

    it('should pseudonymize names consistently', () => {
      const result1 = anonymizer.anonymize('John Doe', {
        technique: AnonymizationTechnique.PSEUDONYMIZATION,
        config: { seed: 12345 },
      });
      const result2 = anonymizer.anonymize('John Doe', {
        technique: AnonymizationTechnique.PSEUDONYMIZATION,
        config: { seed: 12345 },
      });

      expect(result1).toBe(result2);
      expect(result1).not.toBe('John Doe');
    });

    it('should mask data preserving format', () => {
      const result = anonymizer.anonymize('4111-1111-1111-1111', {
        technique: AnonymizationTechnique.MASKING,
        config: {
          maskChar: 'X',
          maskFromStart: 0,
          maskFromEnd: 4,
          preserveFormat: true,
        },
      });

      expect(result).toMatch(/XXXX-XXXX-XXXX-\d{4}/);
    });

    it('should generalize numeric values', () => {
      const result = anonymizer.anonymize('25', {
        technique: AnonymizationTechnique.GENERALIZATION,
        config: { bucketSize: 10 },
      });

      expect(result).toBe('20-30');
    });

    it('should add noise to values', () => {
      const original = 100;
      const results = new Set<number>();

      for (let i = 0; i < 10; i++) {
        const result = anonymizer.anonymize(String(original), {
          technique: AnonymizationTechnique.NOISE_ADDITION,
          config: { noiseRange: 10 },
        });
        results.add(parseFloat(result));
      }

      expect(results.size).toBeGreaterThan(1); // Some variation
    });

    it('should apply k-anonymity', () => {
      const data = [
        { age: 25, zipcode: '12345' },
        { age: 26, zipcode: '12345' },
        { age: 25, zipcode: '12346' },
      ];

      const result = anonymizer.applyKAnonymity(data, ['age', 'zipcode'], 2);

      // Values should be generalized to ensure k-anonymity
      expect(result.length).toBe(data.length);
    });
  });

  describe('detectPII', () => {
    it('should detect email addresses', () => {
      const hasPII = anonymizer.detectPII('test@example.com');
      expect(hasPII).toBe(true);
    });

    it('should detect SSN patterns', () => {
      const hasPII = anonymizer.detectPII('123-45-6789');
      expect(hasPII).toBe(true);
    });

    it('should detect credit card numbers', () => {
      const hasPII = anonymizer.detectPII('4111111111111111');
      expect(hasPII).toBe(true);
    });

    it('should not flag non-PII data', () => {
      const hasPII = anonymizer.detectPII('Hello World');
      expect(hasPII).toBe(false);
    });
  });
});

describe('SyntheticDataGenerator', () => {
  let generator: SyntheticDataGenerator;

  beforeEach(() => {
    generator = new SyntheticDataGenerator();
  });

  describe('generate', () => {
    it('should generate synthetic entities', async () => {
      const result = await generator.generate({
        sandboxId: 'sandbox-1',
        name: 'Test Generation',
        schemas: [
          {
            entityType: 'Person',
            fields: [
              { name: 'name', type: 'string', generator: 'fullName', config: {}, nullable: false, nullProbability: 0 },
              { name: 'email', type: 'string', generator: 'email', config: {}, nullable: false, nullProbability: 0 },
              { name: 'age', type: 'number', generator: 'age', config: { min: 18, max: 80 }, nullable: false, nullProbability: 0 },
            ],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 100,
          seed: 12345,
          locale: 'en',
          generateRelationships: false,
          connectivityDensity: 0.3,
        },
        outputFormat: 'json',
        requestedBy: 'user-123',
      });

      expect(result.status).toBe('completed');
      expect(result.statistics.entitiesGenerated).toBe(100);
    });

    it('should generate deterministic data with seed', async () => {
      const result1 = await generator.generate({
        sandboxId: 'sandbox-1',
        name: 'Seeded Test 1',
        schemas: [
          {
            entityType: 'Person',
            fields: [
              { name: 'name', type: 'string', generator: 'fullName', config: {}, nullable: false, nullProbability: 0 },
            ],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 10,
          seed: 42,
          locale: 'en',
          generateRelationships: false,
          connectivityDensity: 0.3,
        },
        outputFormat: 'json',
        requestedBy: 'user-123',
      });

      const result2 = await generator.generate({
        sandboxId: 'sandbox-1',
        name: 'Seeded Test 2',
        schemas: [
          {
            entityType: 'Person',
            fields: [
              { name: 'name', type: 'string', generator: 'fullName', config: {}, nullable: false, nullProbability: 0 },
            ],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 10,
          seed: 42,
          locale: 'en',
          generateRelationships: false,
          connectivityDensity: 0.3,
        },
        outputFormat: 'json',
        requestedBy: 'user-123',
      });

      expect(result1.sampleData).toEqual(result2.sampleData);
    });

    it('should generate relationships between entities', async () => {
      const result = await generator.generate({
        sandboxId: 'sandbox-1',
        name: 'Relationship Test',
        schemas: [
          {
            entityType: 'Person',
            fields: [
              { name: 'name', type: 'string', generator: 'fullName', config: {}, nullable: false, nullProbability: 0 },
            ],
            relationshipTypes: [
              {
                type: 'KNOWS',
                targetEntityType: 'Person',
                direction: 'outgoing',
                probability: 0.5,
                minCount: 1,
                maxCount: 5,
              },
            ],
          },
        ],
        config: {
          totalEntities: 50,
          seed: 12345,
          locale: 'en',
          generateRelationships: true,
          connectivityDensity: 0.3,
        },
        outputFormat: 'json',
        requestedBy: 'user-123',
      });

      expect(result.status).toBe('completed');
      expect(result.statistics.relationshipsGenerated).toBeGreaterThan(0);
    });

    it('should handle multiple entity types', async () => {
      const result = await generator.generate({
        sandboxId: 'sandbox-1',
        name: 'Multi Entity Test',
        schemas: [
          {
            entityType: 'Person',
            fields: [
              { name: 'name', type: 'string', generator: 'fullName', config: {}, nullable: false, nullProbability: 0 },
            ],
            relationshipTypes: [],
          },
          {
            entityType: 'Organization',
            fields: [
              { name: 'name', type: 'string', generator: 'companyName', config: {}, nullable: false, nullProbability: 0 },
            ],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 100,
          entityDistribution: { Person: 0.7, Organization: 0.3 },
          seed: 12345,
          locale: 'en',
          generateRelationships: false,
          connectivityDensity: 0.3,
        },
        outputFormat: 'json',
        requestedBy: 'user-123',
      });

      expect(result.status).toBe('completed');
      expect(result.statistics.byEntityType['Person']).toBeCloseTo(70, -1);
      expect(result.statistics.byEntityType['Organization']).toBeCloseTo(30, -1);
    });
  });

  describe('built-in generators', () => {
    it('should have common data generators', () => {
      const generators = generator.getAvailableGenerators();

      expect(generators).toContain('fullName');
      expect(generators).toContain('email');
      expect(generators).toContain('phone');
      expect(generators).toContain('address');
      expect(generators).toContain('uuid');
      expect(generators).toContain('date');
      expect(generators).toContain('companyName');
    });
  });
});

describe('PromotionWorkflow', () => {
  let workflow: PromotionWorkflow;
  let manager: SandboxConfigManager;

  beforeEach(async () => {
    workflow = new PromotionWorkflow();
    manager = new SandboxConfigManager();
  });

  describe('createRequest', () => {
    it('should create a promotion request', async () => {
      const sandbox = await manager.createProfile(
        { name: 'Promote Test' },
        'user-123',
        'dataLab'
      );
      await manager.activateProfile(sandbox.id);

      const request = await workflow.createRequest(
        sandbox.id,
        'prod-tenant-id',
        'user-123',
        { type: 'query', id: 'query-1', name: 'Test Query', version: '1.0.0' },
        'This query improves performance',
        'Revert to previous version'
      );

      expect(request.id).toBeDefined();
      expect(request.status).toBe('draft');
      expect(request.sandboxId).toBe(sandbox.id);
    });
  });

  describe('submitForReview', () => {
    it('should submit request for review', async () => {
      const sandbox = await manager.createProfile(
        { name: 'Review Test' },
        'user-123'
      );
      await manager.activateProfile(sandbox.id);

      const request = await workflow.createRequest(
        sandbox.id,
        'prod-tenant-id',
        'user-123',
        { type: 'workflow', id: 'wf-1', name: 'Test Workflow' },
        'Justification text'
      );

      const submitted = await workflow.submitForReview(request.id, [
        'reviewer-1',
        'reviewer-2',
      ]);

      expect(submitted.status).toBe('pending_review');
      expect(submitted.reviewers).toContain('reviewer-1');
      expect(submitted.reviewers).toContain('reviewer-2');
    });
  });

  describe('addApproval', () => {
    it('should add approval from reviewer', async () => {
      const sandbox = await manager.createProfile(
        { name: 'Approval Test' },
        'user-123'
      );
      await manager.activateProfile(sandbox.id);

      const request = await workflow.createRequest(
        sandbox.id,
        'prod-tenant-id',
        'user-123',
        { type: 'script', id: 'script-1', name: 'Test Script' },
        'Justification'
      );
      await workflow.submitForReview(request.id, ['reviewer-1']);

      const approved = await workflow.addApproval(
        request.id,
        'reviewer-1',
        'approve',
        'Looks good!'
      );

      expect(approved.approvals.length).toBe(1);
      expect(approved.approvals[0].decision).toBe('approve');
    });

    it('should reject promotion request', async () => {
      const sandbox = await manager.createProfile(
        { name: 'Reject Test' },
        'user-123'
      );
      await manager.activateProfile(sandbox.id);

      const request = await workflow.createRequest(
        sandbox.id,
        'prod-tenant-id',
        'user-123',
        { type: 'model', id: 'model-1', name: 'Test Model' },
        'Justification'
      );
      await workflow.submitForReview(request.id, ['reviewer-1']);

      const rejected = await workflow.addApproval(
        request.id,
        'reviewer-1',
        'reject',
        'Security concerns'
      );

      expect(rejected.status).toBe('rejected');
    });
  });

  describe('executePromotion', () => {
    it('should execute approved promotion', async () => {
      const sandbox = await manager.createProfile(
        { name: 'Execute Test' },
        'user-123'
      );
      await manager.activateProfile(sandbox.id);

      const request = await workflow.createRequest(
        sandbox.id,
        'prod-tenant-id',
        'user-123',
        { type: 'configuration', id: 'config-1', name: 'Test Config' },
        'Justification'
      );
      await workflow.submitForReview(request.id, ['reviewer-1']);
      await workflow.addApproval(request.id, 'reviewer-1', 'approve');

      const promoted = await workflow.executePromotion(request.id);

      expect(promoted.status).toBe('promoted');
      expect(promoted.promotedAt).toBeDefined();
    });

    it('should fail to execute unapproved promotion', async () => {
      const sandbox = await manager.createProfile(
        { name: 'Fail Execute Test' },
        'user-123'
      );
      await manager.activateProfile(sandbox.id);

      const request = await workflow.createRequest(
        sandbox.id,
        'prod-tenant-id',
        'user-123',
        { type: 'query', id: 'query-1', name: 'Test' },
        'Justification'
      );

      await expect(workflow.executePromotion(request.id)).rejects.toThrow();
    });
  });

  describe('rollback', () => {
    it('should rollback promoted request', async () => {
      const sandbox = await manager.createProfile(
        { name: 'Rollback Test' },
        'user-123'
      );
      await manager.activateProfile(sandbox.id);

      const request = await workflow.createRequest(
        sandbox.id,
        'prod-tenant-id',
        'user-123',
        { type: 'query', id: 'query-1', name: 'Test' },
        'Justification',
        'Rollback plan'
      );
      await workflow.submitForReview(request.id, ['reviewer-1']);
      await workflow.addApproval(request.id, 'reviewer-1', 'approve');
      await workflow.executePromotion(request.id);

      const rolledBack = await workflow.rollback(request.id, 'Regression found');

      expect(rolledBack.status).toBe('rolled_back');
    });
  });
});

describe('Data Isolation', () => {
  let cloneService: DataCloneService;
  let manager: SandboxConfigManager;

  beforeEach(() => {
    cloneService = new DataCloneService();
    manager = new SandboxConfigManager();
  });

  it('should isolate data between sandboxes', async () => {
    const sandbox1 = await manager.createProfile(
      { name: 'Sandbox 1' },
      'user-1',
      'dataLab'
    );
    await manager.activateProfile(sandbox1.id);

    const sandbox2 = await manager.createProfile(
      { name: 'Sandbox 2' },
      'user-2',
      'dataLab'
    );
    await manager.activateProfile(sandbox2.id);

    const s1Profile = await manager.getProfile(sandbox1.id);
    const s2Profile = await manager.getProfile(sandbox2.id);

    // Clone to sandbox 1
    const clone1 = await cloneService.clone(
      {
        id: 'clone-s1',
        sandboxId: sandbox1.id,
        name: 'S1 Clone',
        sourceType: DataSourceType.NEO4J,
        sourceConfig: {},
        strategy: CloneStrategy.SYNTHETIC,
        requestedBy: 'user-1',
        requestedAt: new Date(),
      },
      s1Profile!
    );

    // Clone to sandbox 2 should be independent
    const clone2 = await cloneService.clone(
      {
        id: 'clone-s2',
        sandboxId: sandbox2.id,
        name: 'S2 Clone',
        sourceType: DataSourceType.NEO4J,
        sourceConfig: {},
        strategy: CloneStrategy.SYNTHETIC,
        requestedBy: 'user-2',
        requestedAt: new Date(),
      },
      s2Profile!
    );

    expect(clone1.sandboxId).not.toBe(clone2.sandboxId);
  });

  it('should not allow cross-sandbox data access', async () => {
    const sandbox1 = await manager.createProfile(
      { name: 'Sandbox 1' },
      'user-1',
      'dataLab'
    );
    await manager.activateProfile(sandbox1.id);

    const s1Profile = await manager.getProfile(sandbox1.id);

    // Attempt to clone from another sandbox should fail
    await expect(
      cloneService.clone(
        {
          id: 'cross-clone',
          sandboxId: sandbox1.id,
          name: 'Cross Clone',
          sourceType: DataSourceType.INVESTIGATION,
          sourceConfig: { investigationId: 'other-sandbox-investigation' },
          strategy: CloneStrategy.SYNTHETIC,
          requestedBy: 'user-1',
          requestedAt: new Date(),
        },
        s1Profile!
      )
    ).rejects.toThrow();
  });
});
