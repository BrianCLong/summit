"use strict";
/**
 * Unit Tests: Provenance Functionality
 *
 * Tests for provenance chains, hashing, and verification
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const provenance_js_1 = require("../../canonical/provenance.js");
(0, globals_1.describe)('Provenance Functionality', () => {
    (0, globals_1.describe)('Hashing', () => {
        (0, globals_1.it)('should create consistent hashes for sources', () => {
            const source = {
                sourceId: 'api-endpoint-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01T00:00:00Z'),
                sourceMetadata: { version: '1.0' },
            };
            const hash1 = (0, provenance_js_1.hashSource)(source);
            const hash2 = (0, provenance_js_1.hashSource)(source);
            (0, globals_1.expect)(hash1).toBe(hash2);
            (0, globals_1.expect)(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
        });
        (0, globals_1.it)('should create different hashes for different sources', () => {
            const source1 = {
                sourceId: 'api-endpoint-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01T00:00:00Z'),
                sourceMetadata: {},
            };
            const source2 = {
                sourceId: 'api-endpoint-2',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01T00:00:00Z'),
                sourceMetadata: {},
            };
            const hash1 = (0, provenance_js_1.hashSource)(source1);
            const hash2 = (0, provenance_js_1.hashSource)(source2);
            (0, globals_1.expect)(hash1).not.toBe(hash2);
        });
        (0, globals_1.it)('should create consistent hashes for assertions', () => {
            const assertion = {
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
            const hash1 = (0, provenance_js_1.hashAssertion)(assertion);
            const hash2 = (0, provenance_js_1.hashAssertion)(assertion);
            (0, globals_1.expect)(hash1).toBe(hash2);
            (0, globals_1.expect)(hash1).toHaveLength(64);
        });
        (0, globals_1.it)('should sort evidence arrays before hashing', () => {
            const assertion1 = {
                assertionId: 'assertion-1',
                claim: 'Entity exists',
                assertedBy: { type: 'user', identifier: 'user-123' },
                assertedAt: new Date('2023-01-01T00:00:00Z'),
                confidence: 0.95,
                evidence: ['doc-1', 'doc-2', 'doc-3'],
            };
            const assertion2 = {
                assertionId: 'assertion-1',
                claim: 'Entity exists',
                assertedBy: { type: 'user', identifier: 'user-123' },
                assertedAt: new Date('2023-01-01T00:00:00Z'),
                confidence: 0.95,
                evidence: ['doc-3', 'doc-1', 'doc-2'], // Different order
            };
            const hash1 = (0, provenance_js_1.hashAssertion)(assertion1);
            const hash2 = (0, provenance_js_1.hashAssertion)(assertion2);
            (0, globals_1.expect)(hash1).toBe(hash2); // Should be the same despite different order
        });
        (0, globals_1.it)('should create consistent hashes for transforms', () => {
            const transform = {
                transformId: 'transform-1',
                transformType: 'normalization',
                algorithm: 'name-normalizer',
                algorithmVersion: '1.0.0',
                inputs: ['entity-1'],
                parameters: { caseNormalization: 'upper' },
                transformedAt: new Date('2023-01-01T00:00:00Z'),
            };
            const hash1 = (0, provenance_js_1.hashTransform)(transform);
            const hash2 = (0, provenance_js_1.hashTransform)(transform);
            (0, globals_1.expect)(hash1).toBe(hash2);
            (0, globals_1.expect)(hash1).toHaveLength(64);
        });
    });
    (0, globals_1.describe)('Provenance Chain Creation', () => {
        (0, globals_1.it)('should create a valid provenance chain', () => {
            const source = {
                sourceId: 'api-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01'),
                sourceMetadata: {},
            };
            const assertions = [
                {
                    assertionId: 'assertion-1',
                    claim: 'Person exists',
                    assertedBy: { type: 'system', identifier: 'import-job' },
                    assertedAt: new Date('2023-01-01'),
                    confidence: 1.0,
                    evidence: [],
                },
            ];
            const transforms = [
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
            const chain = (0, provenance_js_1.createProvenanceChain)('chain-1', source, assertions, transforms);
            (0, globals_1.expect)(chain.chainId).toBe('chain-1');
            (0, globals_1.expect)(chain.source.sourceContentHash).toBeDefined();
            (0, globals_1.expect)(chain.assertions[0].assertionHash).toBeDefined();
            (0, globals_1.expect)(chain.transforms[0].transformHash).toBeDefined();
            (0, globals_1.expect)(chain.chainHash).toBeDefined();
            (0, globals_1.expect)(chain.chainHash).toHaveLength(64);
        });
        (0, globals_1.it)('should create different chain hashes for different content', () => {
            const source = {
                sourceId: 'api-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01'),
                sourceMetadata: {},
            };
            const assertion1 = {
                assertionId: 'assertion-1',
                claim: 'Person exists',
                assertedBy: { type: 'system', identifier: 'import-job' },
                assertedAt: new Date('2023-01-01'),
                confidence: 1.0,
                evidence: [],
            };
            const assertion2 = {
                assertionId: 'assertion-2',
                claim: 'Person does not exist',
                assertedBy: { type: 'system', identifier: 'import-job' },
                assertedAt: new Date('2023-01-01'),
                confidence: 1.0,
                evidence: [],
            };
            const chain1 = (0, provenance_js_1.createProvenanceChain)('chain-1', source, [assertion1], []);
            const chain2 = (0, provenance_js_1.createProvenanceChain)('chain-2', source, [assertion2], []);
            (0, globals_1.expect)(chain1.chainHash).not.toBe(chain2.chainHash);
        });
    });
    (0, globals_1.describe)('Provenance Chain Verification', () => {
        (0, globals_1.it)('should verify a valid provenance chain', () => {
            const chain = (0, provenance_js_1.createProvenanceChain)('chain-1', {
                sourceId: 'api-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01'),
                sourceMetadata: {},
            }, [
                {
                    assertionId: 'assertion-1',
                    claim: 'Person exists',
                    assertedBy: { type: 'system', identifier: 'import-job' },
                    assertedAt: new Date('2023-01-01'),
                    confidence: 1.0,
                    evidence: [],
                },
            ], [
                {
                    transformId: 'transform-1',
                    transformType: 'normalization',
                    algorithm: 'name-normalizer',
                    algorithmVersion: '1.0.0',
                    inputs: ['raw-data-1'],
                    parameters: {},
                    transformedAt: new Date('2023-01-01'),
                },
            ]);
            const verification = (0, provenance_js_1.verifyChain)(chain);
            (0, globals_1.expect)(verification.valid).toBe(true);
            (0, globals_1.expect)(verification.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should detect tampering in source hash', () => {
            const chain = (0, provenance_js_1.createProvenanceChain)('chain-1', {
                sourceId: 'api-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01'),
                sourceMetadata: {},
            }, [], []);
            // Tamper with source hash
            chain.source.sourceContentHash = 'tampered-hash';
            const verification = (0, provenance_js_1.verifyChain)(chain);
            (0, globals_1.expect)(verification.valid).toBe(false);
            (0, globals_1.expect)(verification.errors.length).toBeGreaterThan(0);
            (0, globals_1.expect)(verification.errors[0]).toContain('Source hash mismatch');
        });
        (0, globals_1.it)('should detect tampering in assertion hash', () => {
            const chain = (0, provenance_js_1.createProvenanceChain)('chain-1', {
                sourceId: 'api-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01'),
                sourceMetadata: {},
            }, [
                {
                    assertionId: 'assertion-1',
                    claim: 'Person exists',
                    assertedBy: { type: 'system', identifier: 'import-job' },
                    assertedAt: new Date('2023-01-01'),
                    confidence: 1.0,
                    evidence: [],
                },
            ], []);
            // Tamper with assertion hash
            chain.assertions[0].assertionHash = 'tampered-hash';
            const verification = (0, provenance_js_1.verifyChain)(chain);
            (0, globals_1.expect)(verification.valid).toBe(false);
            (0, globals_1.expect)(verification.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should detect tampering in chain hash', () => {
            const chain = (0, provenance_js_1.createProvenanceChain)('chain-1', {
                sourceId: 'api-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01'),
                sourceMetadata: {},
            }, [], []);
            // Tamper with chain hash
            chain.chainHash = 'tampered-hash';
            const verification = (0, provenance_js_1.verifyChain)(chain);
            (0, globals_1.expect)(verification.valid).toBe(false);
            (0, globals_1.expect)(verification.errors[0]).toContain('Chain hash mismatch');
        });
    });
    (0, globals_1.describe)('Provenance Manifest', () => {
        (0, globals_1.it)('should create a valid provenance manifest', () => {
            const chain1 = (0, provenance_js_1.createProvenanceChain)('chain-1', {
                sourceId: 'api-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01'),
                sourceMetadata: {},
            }, [
                {
                    assertionId: 'assertion-1',
                    claim: 'Person exists',
                    assertedBy: { type: 'system', identifier: 'import-job' },
                    assertedAt: new Date('2023-01-01'),
                    confidence: 1.0,
                    evidence: [],
                },
            ], []);
            const chain2 = (0, provenance_js_1.createProvenanceChain)('chain-2', {
                sourceId: 'api-2',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-02'),
                sourceMetadata: {},
            }, [
                {
                    assertionId: 'assertion-2',
                    claim: 'Organization exists',
                    assertedBy: { type: 'system', identifier: 'import-job' },
                    assertedAt: new Date('2023-01-02'),
                    confidence: 1.0,
                    evidence: [],
                },
            ], []);
            const manifest = (0, provenance_js_1.createProvenanceManifest)({
                entityIds: ['person-1', 'org-1'],
                entityTypes: ['Person', 'Organization'],
            }, [chain1, chain2], {
                generatedAt: new Date('2023-01-03'),
                generatedBy: 'export-service',
                description: 'Test manifest',
            });
            (0, globals_1.expect)(manifest.version).toBe('1.0.0');
            (0, globals_1.expect)(manifest.chains).toHaveLength(2);
            (0, globals_1.expect)(manifest.manifestHash).toBeDefined();
            (0, globals_1.expect)(manifest.manifestHash).toHaveLength(64);
        });
        (0, globals_1.it)('should verify a valid manifest', () => {
            const chain = (0, provenance_js_1.createProvenanceChain)('chain-1', {
                sourceId: 'api-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01'),
                sourceMetadata: {},
            }, [], []);
            const manifest = (0, provenance_js_1.createProvenanceManifest)({
                entityIds: ['entity-1'],
                entityTypes: ['Person'],
            }, [chain], {
                generatedAt: new Date('2023-01-02'),
                generatedBy: 'export-service',
            });
            const verification = (0, provenance_js_1.verifyManifest)(manifest);
            (0, globals_1.expect)(verification.valid).toBe(true);
            (0, globals_1.expect)(verification.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should detect tampering in manifest', () => {
            const chain = (0, provenance_js_1.createProvenanceChain)('chain-1', {
                sourceId: 'api-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01'),
                sourceMetadata: {},
            }, [], []);
            const manifest = (0, provenance_js_1.createProvenanceManifest)({
                entityIds: ['entity-1'],
                entityTypes: ['Person'],
            }, [chain], {
                generatedAt: new Date('2023-01-02'),
                generatedBy: 'export-service',
            });
            // Tamper with manifest hash
            manifest.manifestHash = 'tampered-hash';
            const verification = (0, provenance_js_1.verifyManifest)(manifest);
            (0, globals_1.expect)(verification.valid).toBe(false);
            (0, globals_1.expect)(verification.errors[0]).toContain('Manifest hash mismatch');
        });
        (0, globals_1.it)('should detect tampering in contained chains', () => {
            const chain = (0, provenance_js_1.createProvenanceChain)('chain-1', {
                sourceId: 'api-1',
                sourceType: 'api',
                retrievedAt: new Date('2023-01-01'),
                sourceMetadata: {},
            }, [], []);
            const manifest = (0, provenance_js_1.createProvenanceManifest)({
                entityIds: ['entity-1'],
                entityTypes: ['Person'],
            }, [chain], {
                generatedAt: new Date('2023-01-02'),
                generatedBy: 'export-service',
            });
            // Tamper with a chain within the manifest
            manifest.chains[0].chainHash = 'tampered-hash';
            const verification = (0, provenance_js_1.verifyManifest)(manifest);
            (0, globals_1.expect)(verification.valid).toBe(false);
            (0, globals_1.expect)(verification.errors.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('End-to-End Provenance Flow', () => {
        (0, globals_1.it)('should create and verify a complete provenance chain', () => {
            // Step 1: Data source
            const source = {
                sourceId: 'https://api.example.com/people/123',
                sourceType: 'rest_api',
                retrievedAt: new Date('2023-06-15T10:30:00Z'),
                sourceMetadata: {
                    responseCode: 200,
                    apiVersion: '2.0',
                },
            };
            // Step 2: Assertions about the data
            const assertions = [
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
            const transforms = [
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
            const chain = (0, provenance_js_1.createProvenanceChain)('chain-person-123', source, assertions, transforms);
            // Verify the chain
            const verification = (0, provenance_js_1.verifyChain)(chain);
            (0, globals_1.expect)(verification.valid).toBe(true);
            (0, globals_1.expect)(verification.errors).toHaveLength(0);
            // Check all components have hashes
            (0, globals_1.expect)(chain.source.sourceContentHash).toBeDefined();
            (0, globals_1.expect)(chain.assertions).toHaveLength(2);
            (0, globals_1.expect)(chain.assertions[0].assertionHash).toBeDefined();
            (0, globals_1.expect)(chain.assertions[1].assertionHash).toBeDefined();
            (0, globals_1.expect)(chain.transforms).toHaveLength(2);
            (0, globals_1.expect)(chain.transforms[0].transformHash).toBeDefined();
            (0, globals_1.expect)(chain.transforms[1].transformHash).toBeDefined();
            (0, globals_1.expect)(chain.chainHash).toBeDefined();
            // Create a manifest containing this chain
            const manifest = (0, provenance_js_1.createProvenanceManifest)({
                entityIds: ['person-123'],
                entityTypes: ['Person'],
                timeRange: {
                    from: new Date('2023-06-15T10:30:00Z'),
                    to: new Date('2023-06-15T10:30:10Z'),
                },
            }, [chain], {
                generatedAt: new Date('2023-06-15T11:00:00Z'),
                generatedBy: 'export-service-v2.0',
                description: 'Provenance manifest for Person 123',
            });
            // Verify the manifest
            const manifestVerification = (0, provenance_js_1.verifyManifest)(manifest);
            (0, globals_1.expect)(manifestVerification.valid).toBe(true);
            (0, globals_1.expect)(manifestVerification.errors).toHaveLength(0);
        });
    });
});
