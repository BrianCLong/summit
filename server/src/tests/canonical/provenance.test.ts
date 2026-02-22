/**
 * Unit Tests: Provenance Functionality
 *
 * Tests for provenance chains, hashing, and verification
 */

import { describe, it, expect } from '@jest/globals';
import {
  hashSource,
  hashAssertion,
  hashTransform,
  hashChain,
  hashManifest,
  verifyChain,
  verifyManifest,
  createProvenanceChain,
  createProvenanceManifest,
  ProvenanceSource,
  ProvenanceAssertion,
  ProvenanceTransform,
} from '../../canonical/provenance';

describe('Provenance Functionality', () => {
  describe('Hashing', () => {
    it('should create consistent hashes for sources', () => {
      const source: Omit<ProvenanceSource, 'sourceContentHash'> = {
        sourceId: 'api-endpoint-1',
        sourceType: 'api',
        retrievedAt: new Date('2023-01-01T00:00:00Z'),
        sourceMetadata: { version: '1.0' },
      };

      const hash1 = hashSource(source);
      const hash2 = hashSource(source);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should create different hashes for different sources', () => {
      const source1: Omit<ProvenanceSource, 'sourceContentHash'> = {
        sourceId: 'api-endpoint-1',
        sourceType: 'api',
        retrievedAt: new Date('2023-01-01T00:00:00Z'),
        sourceMetadata: {},
      };

      const source2: Omit<ProvenanceSource, 'sourceContentHash'> = {
        sourceId: 'api-endpoint-2',
        sourceType: 'api',
        retrievedAt: new Date('2023-01-01T00:00:00Z'),
        sourceMetadata: {},
      };

      const hash1 = hashSource(source1);
      const hash2 = hashSource(source2);

      expect(hash1).not.toBe(hash2);
    });

    it('should create consistent hashes for assertions', () => {
      const assertion: Omit<ProvenanceAssertion, 'assertionHash'> = {
        assertionId: 'assertion-1',
        claim: 'Entity exists',
        assertedBy: {
          type: 'user',
          identifier: 'user-123',
        },
        assertedAt: new Date('2023-01-01T00:00:00Z'),
        confidence: 0.95,
        evidence: ['doc-1', 'doc-2'],
      };

      const hash1 = hashAssertion(assertion);
      const hash2 = hashAssertion(assertion);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should sort evidence arrays before hashing', () => {
      const assertion1: Omit<ProvenanceAssertion, 'assertionHash'> = {
        assertionId: 'assertion-1',
        claim: 'Entity exists',
        assertedBy: { type: 'user', identifier: 'user-123' },
        assertedAt: new Date('2023-01-01T00:00:00Z'),
        confidence: 0.95,
        evidence: ['doc-1', 'doc-2', 'doc-3'],
      };

      const assertion2: Omit<ProvenanceAssertion, 'assertionHash'> = {
        assertionId: 'assertion-1',
        claim: 'Entity exists',
        assertedBy: { type: 'user', identifier: 'user-123' },
        assertedAt: new Date('2023-01-01T00:00:00Z'),
        confidence: 0.95,
        evidence: ['doc-3', 'doc-1', 'doc-2'], // Different order
      };

      const hash1 = hashAssertion(assertion1);
      const hash2 = hashAssertion(assertion2);

      expect(hash1).toBe(hash2); // Should be the same despite different order
    });

    it('should create consistent hashes for transforms', () => {
      const transform: Omit<ProvenanceTransform, 'transformHash'> = {
        transformId: 'transform-1',
        transformType: 'normalization',
        algorithm: 'name-normalizer',
        algorithmVersion: '1.0.0',
        inputs: ['entity-1'],
        parameters: { caseNormalization: 'upper' },
        transformedAt: new Date('2023-01-01T00:00:00Z'),
      };

      const hash1 = hashTransform(transform);
      const hash2 = hashTransform(transform);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('Provenance Chain Creation', () => {
    it('should create a valid provenance chain', () => {
      const source: Omit<ProvenanceSource, 'sourceContentHash'> = {
        sourceId: 'api-1',
        sourceType: 'api',
        retrievedAt: new Date('2023-01-01'),
        sourceMetadata: {},
      };

      const assertions: Omit<ProvenanceAssertion, 'assertionHash'>[] = [
        {
          assertionId: 'assertion-1',
          claim: 'Person exists',
          assertedBy: { type: 'system', identifier: 'import-job' },
          assertedAt: new Date('2023-01-01'),
          confidence: 1.0,
          evidence: [],
        },
      ];

      const transforms: Omit<ProvenanceTransform, 'transformHash'>[] = [
        {
          transformId: 'transform-1',
          transformType: 'normalization',
          algorithm: 'name-normalizer',
          algorithmVersion: '1.0.0',
          inputs: ['raw-data-1'],
          parameters: {},
          transformedAt: new Date('2023-01-01'),
        },
      ];

      const chain = createProvenanceChain(
        'chain-1',
        source,
        assertions,
        transforms,
      );

      expect(chain.chainId).toBe('chain-1');
      expect(chain.source.sourceContentHash).toBeDefined();
      expect(chain.assertions[0].assertionHash).toBeDefined();
      expect(chain.transforms[0].transformHash).toBeDefined();
      expect(chain.chainHash).toBeDefined();
      expect(chain.chainHash).toHaveLength(64);
    });

    it('should create different chain hashes for different content', () => {
      const source: Omit<ProvenanceSource, 'sourceContentHash'> = {
        sourceId: 'api-1',
        sourceType: 'api',
        retrievedAt: new Date('2023-01-01'),
        sourceMetadata: {},
      };

      const assertion1: Omit<ProvenanceAssertion, 'assertionHash'> = {
        assertionId: 'assertion-1',
        claim: 'Person exists',
        assertedBy: { type: 'system', identifier: 'import-job' },
        assertedAt: new Date('2023-01-01'),
        confidence: 1.0,
        evidence: [],
      };

      const assertion2: Omit<ProvenanceAssertion, 'assertionHash'> = {
        assertionId: 'assertion-2',
        claim: 'Person does not exist',
        assertedBy: { type: 'system', identifier: 'import-job' },
        assertedAt: new Date('2023-01-01'),
        confidence: 1.0,
        evidence: [],
      };

      const chain1 = createProvenanceChain('chain-1', source, [assertion1], []);
      const chain2 = createProvenanceChain('chain-2', source, [assertion2], []);

      expect(chain1.chainHash).not.toBe(chain2.chainHash);
    });
  });

  describe('Provenance Chain Verification', () => {
    it('should verify a valid provenance chain', () => {
      const chain = createProvenanceChain(
        'chain-1',
        {
          sourceId: 'api-1',
          sourceType: 'api',
          retrievedAt: new Date('2023-01-01'),
          sourceMetadata: {},
        },
        [
          {
            assertionId: 'assertion-1',
            claim: 'Person exists',
            assertedBy: { type: 'system', identifier: 'import-job' },
            assertedAt: new Date('2023-01-01'),
            confidence: 1.0,
            evidence: [],
          },
        ],
        [
          {
            transformId: 'transform-1',
            transformType: 'normalization',
            algorithm: 'name-normalizer',
            algorithmVersion: '1.0.0',
            inputs: ['raw-data-1'],
            parameters: {},
            transformedAt: new Date('2023-01-01'),
          },
        ],
      );

      const verification = verifyChain(chain);

      expect(verification.valid).toBe(true);
      expect(verification.errors).toHaveLength(0);
    });

    it('should detect tampering in source hash', () => {
      const chain = createProvenanceChain(
        'chain-1',
        {
          sourceId: 'api-1',
          sourceType: 'api',
          retrievedAt: new Date('2023-01-01'),
          sourceMetadata: {},
        },
        [],
        [],
      );

      // Tamper with source hash
      chain.source.sourceContentHash = 'tampered-hash';

      const verification = verifyChain(chain);

      expect(verification.valid).toBe(false);
      expect(verification.errors.length).toBeGreaterThan(0);
      expect(verification.errors[0]).toContain('Source hash mismatch');
    });

    it('should detect tampering in assertion hash', () => {
      const chain = createProvenanceChain(
        'chain-1',
        {
          sourceId: 'api-1',
          sourceType: 'api',
          retrievedAt: new Date('2023-01-01'),
          sourceMetadata: {},
        },
        [
          {
            assertionId: 'assertion-1',
            claim: 'Person exists',
            assertedBy: { type: 'system', identifier: 'import-job' },
            assertedAt: new Date('2023-01-01'),
            confidence: 1.0,
            evidence: [],
          },
        ],
        [],
      );

      // Tamper with assertion hash
      chain.assertions[0].assertionHash = 'tampered-hash';

      const verification = verifyChain(chain);

      expect(verification.valid).toBe(false);
      expect(verification.errors.length).toBeGreaterThan(0);
    });

    it('should detect tampering in chain hash', () => {
      const chain = createProvenanceChain(
        'chain-1',
        {
          sourceId: 'api-1',
          sourceType: 'api',
          retrievedAt: new Date('2023-01-01'),
          sourceMetadata: {},
        },
        [],
        [],
      );

      // Tamper with chain hash
      chain.chainHash = 'tampered-hash';

      const verification = verifyChain(chain);

      expect(verification.valid).toBe(false);
      expect(verification.errors[0]).toContain('Chain hash mismatch');
    });
  });

  describe('Provenance Manifest', () => {
    it('should create a valid provenance manifest', () => {
      const chain1 = createProvenanceChain(
        'chain-1',
        {
          sourceId: 'api-1',
          sourceType: 'api',
          retrievedAt: new Date('2023-01-01'),
          sourceMetadata: {},
        },
        [
          {
            assertionId: 'assertion-1',
            claim: 'Person exists',
            assertedBy: { type: 'system', identifier: 'import-job' },
            assertedAt: new Date('2023-01-01'),
            confidence: 1.0,
            evidence: [],
          },
        ],
        [],
      );

      const chain2 = createProvenanceChain(
        'chain-2',
        {
          sourceId: 'api-2',
          sourceType: 'api',
          retrievedAt: new Date('2023-01-02'),
          sourceMetadata: {},
        },
        [
          {
            assertionId: 'assertion-2',
            claim: 'Organization exists',
            assertedBy: { type: 'system', identifier: 'import-job' },
            assertedAt: new Date('2023-01-02'),
            confidence: 1.0,
            evidence: [],
          },
        ],
        [],
      );

      const manifest = createProvenanceManifest(
        {
          entityIds: ['person-1', 'org-1'],
          entityTypes: ['Person', 'Organization'],
        },
        [chain1, chain2],
        {
          generatedAt: new Date('2023-01-03'),
          generatedBy: 'export-service',
          description: 'Test manifest',
        },
      );

      expect(manifest.version).toBe('1.0.0');
      expect(manifest.chains).toHaveLength(2);
      expect(manifest.manifestHash).toBeDefined();
      expect(manifest.manifestHash).toHaveLength(64);
    });

    it('should verify a valid manifest', () => {
      const chain = createProvenanceChain(
        'chain-1',
        {
          sourceId: 'api-1',
          sourceType: 'api',
          retrievedAt: new Date('2023-01-01'),
          sourceMetadata: {},
        },
        [],
        [],
      );

      const manifest = createProvenanceManifest(
        {
          entityIds: ['entity-1'],
          entityTypes: ['Person'],
        },
        [chain],
        {
          generatedAt: new Date('2023-01-02'),
          generatedBy: 'export-service',
        },
      );

      const verification = verifyManifest(manifest);

      expect(verification.valid).toBe(true);
      expect(verification.errors).toHaveLength(0);
    });

    it('should detect tampering in manifest', () => {
      const chain = createProvenanceChain(
        'chain-1',
        {
          sourceId: 'api-1',
          sourceType: 'api',
          retrievedAt: new Date('2023-01-01'),
          sourceMetadata: {},
        },
        [],
        [],
      );

      const manifest = createProvenanceManifest(
        {
          entityIds: ['entity-1'],
          entityTypes: ['Person'],
        },
        [chain],
        {
          generatedAt: new Date('2023-01-02'),
          generatedBy: 'export-service',
        },
      );

      // Tamper with manifest hash
      manifest.manifestHash = 'tampered-hash';

      const verification = verifyManifest(manifest);

      expect(verification.valid).toBe(false);
      expect(verification.errors[0]).toContain('Manifest hash mismatch');
    });

    it('should detect tampering in contained chains', () => {
      const chain = createProvenanceChain(
        'chain-1',
        {
          sourceId: 'api-1',
          sourceType: 'api',
          retrievedAt: new Date('2023-01-01'),
          sourceMetadata: {},
        },
        [],
        [],
      );

      const manifest = createProvenanceManifest(
        {
          entityIds: ['entity-1'],
          entityTypes: ['Person'],
        },
        [chain],
        {
          generatedAt: new Date('2023-01-02'),
          generatedBy: 'export-service',
        },
      );

      // Tamper with a chain within the manifest
      manifest.chains[0].chainHash = 'tampered-hash';

      const verification = verifyManifest(manifest);

      expect(verification.valid).toBe(false);
      expect(verification.errors.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Provenance Flow', () => {
    it('should create and verify a complete provenance chain', () => {
      // Step 1: Data source
      const source: Omit<ProvenanceSource, 'sourceContentHash'> = {
        sourceId: 'https://api.example.com/people/123',
        sourceType: 'rest_api',
        retrievedAt: new Date('2023-06-15T10:30:00Z'),
        sourceMetadata: {
          responseCode: 200,
          apiVersion: '2.0',
        },
      };

      // Step 2: Assertions about the data
      const assertions: Omit<ProvenanceAssertion, 'assertionHash'>[] = [
        {
          assertionId: 'assertion-person-exists',
          claim: 'Person with ID 123 exists in source system',
          assertedBy: {
            type: 'system',
            identifier: 'api-connector-v1.2.3',
          },
          assertedAt: new Date('2023-06-15T10:30:01Z'),
          confidence: 1.0,
          evidence: ['http-response-200'],
        },
        {
          assertionId: 'assertion-name-valid',
          claim: 'Person name passes validation',
          assertedBy: {
            type: 'algorithm',
            identifier: 'name-validator-v2.1',
          },
          assertedAt: new Date('2023-06-15T10:30:02Z'),
          confidence: 0.98,
          evidence: ['validation-rules-v2.1'],
        },
      ];

      // Step 3: Transforms applied
      const transforms: Omit<ProvenanceTransform, 'transformHash'>[] = [
        {
          transformId: 'transform-name-normalization',
          transformType: 'normalization',
          algorithm: 'unicode-name-normalizer',
          algorithmVersion: '3.0.1',
          inputs: ['raw-api-response'],
          parameters: {
            normalizationForm: 'NFC',
            caseStyle: 'title',
          },
          transformedAt: new Date('2023-06-15T10:30:03Z'),
        },
        {
          transformId: 'transform-entity-enrichment',
          transformType: 'enrichment',
          algorithm: 'entity-enricher',
          algorithmVersion: '1.5.0',
          inputs: ['normalized-person', 'external-db-lookup'],
          parameters: {
            enrichmentSources: ['corporate-registry', 'sanctions-list'],
          },
          transformedAt: new Date('2023-06-15T10:30:05Z'),
        },
      ];

      // Create the chain
      const chain = createProvenanceChain(
        'chain-person-123',
        source,
        assertions,
        transforms,
      );

      // Verify the chain
      const verification = verifyChain(chain);

      expect(verification.valid).toBe(true);
      expect(verification.errors).toHaveLength(0);

      // Check all components have hashes
      expect(chain.source.sourceContentHash).toBeDefined();
      expect(chain.assertions).toHaveLength(2);
      expect(chain.assertions[0].assertionHash).toBeDefined();
      expect(chain.assertions[1].assertionHash).toBeDefined();
      expect(chain.transforms).toHaveLength(2);
      expect(chain.transforms[0].transformHash).toBeDefined();
      expect(chain.transforms[1].transformHash).toBeDefined();
      expect(chain.chainHash).toBeDefined();

      // Create a manifest containing this chain
      const manifest = createProvenanceManifest(
        {
          entityIds: ['person-123'],
          entityTypes: ['Person'],
          timeRange: {
            from: new Date('2023-06-15T10:30:00Z'),
            to: new Date('2023-06-15T10:30:10Z'),
          },
        },
        [chain],
        {
          generatedAt: new Date('2023-06-15T11:00:00Z'),
          generatedBy: 'export-service-v2.0',
          description: 'Provenance manifest for Person 123',
        },
      );

      // Verify the manifest
      const manifestVerification = verifyManifest(manifest);

      expect(manifestVerification.valid).toBe(true);
      expect(manifestVerification.errors).toHaveLength(0);
    });
  });
});
