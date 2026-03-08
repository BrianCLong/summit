"use strict";
/**
 * Unit tests for Claim relationship endpoints (contradicts/supports)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const axios_1 = __importDefault(require("axios"));
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4010';
const TEST_AUTHORITY = 'test-authority-001';
const TEST_REASON = 'automated testing';
const client = axios_1.default.create({
    baseURL: BASE_URL,
    headers: {
        'x-authority-id': TEST_AUTHORITY,
        'x-reason-for-access': TEST_REASON,
    },
});
(0, globals_1.describe)('Claim Relationships API', () => {
    let claim1Id;
    let claim2Id;
    let claim3Id;
    (0, globals_1.beforeAll)(async () => {
        // Create test claims
        const responses = await Promise.all([
            client.post('/claims', {
                content: { statement: 'The sky is blue', source: 'observation' },
                claimType: 'factual',
            }),
            client.post('/claims', {
                content: { statement: 'The sky appears green', source: 'filtered observation' },
                claimType: 'factual',
            }),
            client.post('/claims', {
                content: { statement: 'The atmosphere scatters light', source: 'physics' },
                claimType: 'factual',
            }),
        ]);
        claim1Id = responses[0].data.id;
        claim2Id = responses[1].data.id;
        claim3Id = responses[2].data.id;
    });
    (0, globals_1.describe)('POST /claim/contradicts', () => {
        (0, globals_1.it)('should create a contradiction between claims', async () => {
            const response = await client.post('/claim/contradicts', {
                sourceClaimId: claim1Id,
                targetClaimId: claim2Id,
                strength: 0.9,
                rationale: 'These claims make contradictory assertions about sky color',
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('id');
            (0, globals_1.expect)(response.data.id).toMatch(/^cr_/);
            (0, globals_1.expect)(response.data.sourceClaimId).toBe(claim1Id);
            (0, globals_1.expect)(response.data.targetClaimId).toBe(claim2Id);
            (0, globals_1.expect)(response.data.relationshipType).toBe('contradicts');
            (0, globals_1.expect)(response.data.strength).toBe(0.9);
            (0, globals_1.expect)(response.data.rationale).toContain('contradictory');
        });
        (0, globals_1.it)('should not allow self-contradiction', async () => {
            try {
                await client.post('/claim/contradicts', {
                    sourceClaimId: claim1Id,
                    targetClaimId: claim1Id,
                });
                (0, globals_1.expect)(true).toBe(false);
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(400);
                (0, globals_1.expect)(error.response.data.error).toContain('itself');
            }
        });
        (0, globals_1.it)('should return 404 for non-existent claims', async () => {
            try {
                await client.post('/claim/contradicts', {
                    sourceClaimId: 'claim_nonexistent',
                    targetClaimId: claim1Id,
                });
                (0, globals_1.expect)(true).toBe(false);
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(404);
            }
        });
    });
    (0, globals_1.describe)('POST /claim/supports', () => {
        (0, globals_1.it)('should create a support relationship between claims', async () => {
            const response = await client.post('/claim/supports', {
                sourceClaimId: claim3Id,
                targetClaimId: claim1Id,
                strength: 0.8,
                rationale: 'Physics explains why the sky appears blue',
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.relationshipType).toBe('supports');
            (0, globals_1.expect)(response.data.sourceClaimId).toBe(claim3Id);
            (0, globals_1.expect)(response.data.targetClaimId).toBe(claim1Id);
        });
    });
    (0, globals_1.describe)('POST /claim/relationship', () => {
        (0, globals_1.it)('should create generic relationship with specified type', async () => {
            // Create new claims for this test
            const newClaim1 = await client.post('/claims', {
                content: { data: 'original claim ' + Date.now() },
            });
            const newClaim2 = await client.post('/claims', {
                content: { data: 'updated claim ' + Date.now() },
            });
            const response = await client.post('/claim/relationship', {
                sourceClaimId: newClaim2.data.id,
                targetClaimId: newClaim1.data.id,
                relationshipType: 'supersedes',
                strength: 1.0,
                rationale: 'Updated version of the claim',
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.relationshipType).toBe('supersedes');
        });
        (0, globals_1.it)('should support "refines" relationship type', async () => {
            const newClaim1 = await client.post('/claims', {
                content: { data: 'broad claim ' + Date.now() },
            });
            const newClaim2 = await client.post('/claims', {
                content: { data: 'specific claim ' + Date.now() },
            });
            const response = await client.post('/claim/relationship', {
                sourceClaimId: newClaim2.data.id,
                targetClaimId: newClaim1.data.id,
                relationshipType: 'refines',
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.relationshipType).toBe('refines');
        });
        (0, globals_1.it)('should upsert on duplicate relationship', async () => {
            const claims = await Promise.all([
                client.post('/claims', { content: { test: 'upsert1-' + Date.now() } }),
                client.post('/claims', { content: { test: 'upsert2-' + Date.now() } }),
            ]);
            // First creation
            const response1 = await client.post('/claim/relationship', {
                sourceClaimId: claims[0].data.id,
                targetClaimId: claims[1].data.id,
                relationshipType: 'supports',
                strength: 0.5,
            });
            (0, globals_1.expect)(response1.status).toBe(200);
            // Upsert with new strength
            const response2 = await client.post('/claim/relationship', {
                sourceClaimId: claims[0].data.id,
                targetClaimId: claims[1].data.id,
                relationshipType: 'supports',
                strength: 0.9,
                rationale: 'Updated rationale',
            });
            (0, globals_1.expect)(response2.status).toBe(200);
            (0, globals_1.expect)(response2.data.strength).toBe(0.9);
        });
    });
    (0, globals_1.describe)('GET /claim/:claimId/contradictions', () => {
        (0, globals_1.it)('should retrieve all contradictions for a claim', async () => {
            const response = await client.get(`/claim/${claim1Id}/contradictions`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.claimId).toBe(claim1Id);
            (0, globals_1.expect)(Array.isArray(response.data.contradictions)).toBe(true);
            // Should include the contradiction we created with claim2
            const contradiction = response.data.contradictions.find((c) => c.claimId === claim2Id);
            (0, globals_1.expect)(contradiction).toBeDefined();
            (0, globals_1.expect)(contradiction.strength).toBe(0.9);
        });
        (0, globals_1.it)('should return empty array for claim with no contradictions', async () => {
            const newClaim = await client.post('/claims', {
                content: { data: 'isolated claim ' + Date.now() },
            });
            const response = await client.get(`/claim/${newClaim.data.id}/contradictions`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.contradictions).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('GET /claim/:claimId/supports', () => {
        (0, globals_1.it)('should retrieve all supporting claims', async () => {
            const response = await client.get(`/claim/${claim3Id}/supports`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.claimId).toBe(claim3Id);
            (0, globals_1.expect)(Array.isArray(response.data.supports)).toBe(true);
        });
    });
    (0, globals_1.describe)('Claim-Evidence Linking', () => {
        let testClaimId;
        let testEvidenceId;
        (0, globals_1.beforeAll)(async () => {
            const claim = await client.post('/claims', {
                content: { statement: 'Test claim for evidence linking ' + Date.now() },
            });
            testClaimId = claim.data.id;
            const evidence = await client.post('/evidence', {
                sourceRef: 'file://test-link-evidence.pdf',
                checksum: 'link_checksum_' + Date.now(),
            });
            testEvidenceId = evidence.data.id;
        });
        (0, globals_1.describe)('POST /claim/link-evidence', () => {
            (0, globals_1.it)('should link evidence to claim with supports relationship', async () => {
                const response = await client.post('/claim/link-evidence', {
                    claimId: testClaimId,
                    evidenceId: testEvidenceId,
                    relationshipType: 'supports',
                    confidence: 0.85,
                });
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.data).toHaveProperty('id');
                (0, globals_1.expect)(response.data.claimId).toBe(testClaimId);
                (0, globals_1.expect)(response.data.evidenceId).toBe(testEvidenceId);
                (0, globals_1.expect)(response.data.relationshipType).toBe('supports');
                (0, globals_1.expect)(response.data.confidence).toBe(0.85);
            });
            (0, globals_1.it)('should link evidence with contradicts relationship', async () => {
                const newEvidence = await client.post('/evidence', {
                    sourceRef: 'file://contradicting-evidence.pdf',
                    checksum: 'contradict_' + Date.now(),
                });
                const response = await client.post('/claim/link-evidence', {
                    claimId: testClaimId,
                    evidenceId: newEvidence.data.id,
                    relationshipType: 'contradicts',
                    confidence: 0.7,
                });
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.data.relationshipType).toBe('contradicts');
            });
            (0, globals_1.it)('should upsert on duplicate claim-evidence link', async () => {
                // Update the existing link
                const response = await client.post('/claim/link-evidence', {
                    claimId: testClaimId,
                    evidenceId: testEvidenceId,
                    relationshipType: 'references',
                    confidence: 0.95,
                });
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.data.relationshipType).toBe('references');
                (0, globals_1.expect)(response.data.confidence).toBe(0.95);
            });
            (0, globals_1.it)('should return 404 for non-existent claim', async () => {
                try {
                    await client.post('/claim/link-evidence', {
                        claimId: 'claim_nonexistent',
                        evidenceId: testEvidenceId,
                    });
                    (0, globals_1.expect)(true).toBe(false);
                }
                catch (error) {
                    (0, globals_1.expect)(error.response.status).toBe(404);
                    (0, globals_1.expect)(error.response.data.error).toContain('Claim');
                }
            });
            (0, globals_1.it)('should return 404 for non-existent evidence', async () => {
                try {
                    await client.post('/claim/link-evidence', {
                        claimId: testClaimId,
                        evidenceId: 'evidence_nonexistent',
                    });
                    (0, globals_1.expect)(true).toBe(false);
                }
                catch (error) {
                    (0, globals_1.expect)(error.response.status).toBe(404);
                    (0, globals_1.expect)(error.response.data.error).toContain('Evidence');
                }
            });
        });
        (0, globals_1.describe)('GET /claim/:claimId/evidence', () => {
            (0, globals_1.it)('should retrieve all evidence linked to claim', async () => {
                const response = await client.get(`/claim/${testClaimId}/evidence`);
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.data.claimId).toBe(testClaimId);
                (0, globals_1.expect)(Array.isArray(response.data.evidence)).toBe(true);
                (0, globals_1.expect)(response.data.evidence.length).toBeGreaterThan(0);
                const linkedEvidence = response.data.evidence[0];
                (0, globals_1.expect)(linkedEvidence).toHaveProperty('id');
                (0, globals_1.expect)(linkedEvidence).toHaveProperty('relationshipType');
                (0, globals_1.expect)(linkedEvidence).toHaveProperty('checksum');
                (0, globals_1.expect)(linkedEvidence).toHaveProperty('linkedAt');
            });
        });
    });
});
