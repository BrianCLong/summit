"use strict";
/**
 * Unit tests for Manifest export and verification endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const axios_1 = __importDefault(require("axios"));
const pg_1 = require("pg");
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
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/provenance',
});
(0, globals_1.describe)('Manifests API', () => {
    let testCaseId;
    let evidenceIds = [];
    let claimIds = [];
    (0, globals_1.beforeAll)(async () => {
        // Create a test case
        testCaseId = 'case_manifest_test_' + Date.now();
        await pool.query(`INSERT INTO cases (id, title, status, created_by)
       VALUES ($1, $2, $3, $4)`, [testCaseId, 'Manifest Test Case', 'active', TEST_AUTHORITY]);
        // Register evidence for the case
        const evidenceData = [
            { sourceRef: 'file://manifest-ev-001.pdf', checksum: 'manifest_hash_1_' + Date.now() },
            { sourceRef: 'file://manifest-ev-002.jpg', checksum: 'manifest_hash_2_' + Date.now() },
            { sourceRef: 'file://manifest-ev-003.doc', checksum: 'manifest_hash_3_' + Date.now() },
        ];
        for (const data of evidenceData) {
            const response = await client.post('/evidence', {
                caseId: testCaseId,
                ...data,
            });
            evidenceIds.push(response.data.id);
        }
        // Create claims
        const claimData = [
            { content: { statement: 'Manifest claim 1 ' + Date.now() }, claimType: 'factual' },
            { content: { statement: 'Manifest claim 2 ' + Date.now() }, claimType: 'inferential' },
        ];
        for (const data of claimData) {
            const response = await client.post('/claims', data);
            claimIds.push(response.data.id);
        }
    });
    (0, globals_1.describe)('POST /manifest/export', () => {
        (0, globals_1.it)('should export manifest for a case', async () => {
            const response = await client.post('/manifest/export', {
                caseId: testCaseId,
                manifestType: 'disclosure',
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('manifestId');
            (0, globals_1.expect)(response.data.manifestId).toMatch(/^manifest_/);
            (0, globals_1.expect)(response.data.manifestVersion).toBe('2.0.0');
            (0, globals_1.expect)(response.data.manifestType).toBe('disclosure');
            (0, globals_1.expect)(response.data.caseId).toBe(testCaseId);
            (0, globals_1.expect)(response.data).toHaveProperty('contentHash');
            (0, globals_1.expect)(response.data).toHaveProperty('merkleRoot');
            (0, globals_1.expect)(response.data.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
            (0, globals_1.expect)(Array.isArray(response.data.items)).toBe(true);
            (0, globals_1.expect)(response.data.items.length).toBe(evidenceIds.length);
            (0, globals_1.expect)(Array.isArray(response.data.proofs)).toBe(true);
            (0, globals_1.expect)(response.data.proofs.length).toBe(evidenceIds.length);
        });
        (0, globals_1.it)('should export manifest for specific evidence IDs', async () => {
            const selectedIds = evidenceIds.slice(0, 2);
            const response = await client.post('/manifest/export', {
                evidenceIds: selectedIds,
                manifestType: 'selective',
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.manifestType).toBe('selective');
            (0, globals_1.expect)(response.data.items.length).toBe(2);
            const itemIds = response.data.items.map((i) => i.id);
            (0, globals_1.expect)(itemIds).toEqual(globals_1.expect.arrayContaining(selectedIds));
        });
        (0, globals_1.it)('should export manifest with claims', async () => {
            const response = await client.post('/manifest/export', {
                claimIds: claimIds,
                manifestType: 'audit',
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.manifestType).toBe('audit');
            (0, globals_1.expect)(response.data.items.length).toBe(claimIds.length);
            const claimItems = response.data.items.filter((i) => i.type === 'claim');
            (0, globals_1.expect)(claimItems.length).toBe(claimIds.length);
        });
        (0, globals_1.it)('should export mixed manifest with evidence and claims', async () => {
            const response = await client.post('/manifest/export', {
                evidenceIds: [evidenceIds[0]],
                claimIds: [claimIds[0]],
                manifestType: 'chain-of-custody',
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.items.length).toBe(2);
            const types = response.data.items.map((i) => i.type);
            (0, globals_1.expect)(types).toContain('evidence');
            (0, globals_1.expect)(types).toContain('claim');
        });
        (0, globals_1.it)('should generate valid Merkle proofs', async () => {
            const response = await client.post('/manifest/export', {
                caseId: testCaseId,
            });
            (0, globals_1.expect)(response.status).toBe(200);
            // Each proof should have the correct structure
            for (const proof of response.data.proofs) {
                (0, globals_1.expect)(proof).toHaveProperty('itemId');
                (0, globals_1.expect)(proof).toHaveProperty('itemType');
                (0, globals_1.expect)(proof).toHaveProperty('leafHash');
                (0, globals_1.expect)(Array.isArray(proof.proof)).toBe(true);
                // Each step in proof should have dir and hash
                for (const step of proof.proof) {
                    (0, globals_1.expect)(['L', 'R']).toContain(step.dir);
                    (0, globals_1.expect)(step.hash).toMatch(/^[a-f0-9]{64}$/);
                }
            }
        });
    });
    (0, globals_1.describe)('GET /manifest/:manifestId', () => {
        let testManifestId;
        (0, globals_1.beforeAll)(async () => {
            const response = await client.post('/manifest/export', {
                caseId: testCaseId,
                manifestType: 'disclosure',
            });
            testManifestId = response.data.manifestId;
        });
        (0, globals_1.it)('should retrieve existing manifest', async () => {
            const response = await client.get(`/manifest/${testManifestId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.manifestId).toBe(testManifestId);
            (0, globals_1.expect)(response.data.caseId).toBe(testCaseId);
            (0, globals_1.expect)(response.data).toHaveProperty('merkleRoot');
            (0, globals_1.expect)(response.data).toHaveProperty('proofs');
            (0, globals_1.expect)(response.data).toHaveProperty('created_at');
        });
        (0, globals_1.it)('should return 404 for non-existent manifest', async () => {
            try {
                await client.get('/manifest/manifest_nonexistent');
                (0, globals_1.expect)(true).toBe(false);
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(404);
            }
        });
    });
    (0, globals_1.describe)('POST /manifest/verify', () => {
        let validManifestId;
        (0, globals_1.beforeAll)(async () => {
            const response = await client.post('/manifest/export', {
                caseId: testCaseId,
                manifestType: 'disclosure',
            });
            validManifestId = response.data.manifestId;
        });
        (0, globals_1.it)('should verify valid manifest', async () => {
            const response = await client.post('/manifest/verify', {
                manifestId: validManifestId,
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.valid).toBe(true);
            (0, globals_1.expect)(response.data.manifestId).toBe(validManifestId);
            (0, globals_1.expect)(response.data.merkleValid).toBe(true);
            (0, globals_1.expect)(response.data.itemsVerified).toBeGreaterThan(0);
            (0, globals_1.expect)(response.data.itemsValid).toBe(response.data.itemsVerified);
            (0, globals_1.expect)(response.data).toHaveProperty('verified_at');
        });
        (0, globals_1.it)('should return item verification details', async () => {
            const response = await client.post('/manifest/verify', {
                manifestId: validManifestId,
            });
            (0, globals_1.expect)(Array.isArray(response.data.itemVerifications)).toBe(true);
            for (const verification of response.data.itemVerifications) {
                (0, globals_1.expect)(verification).toHaveProperty('itemId');
                (0, globals_1.expect)(verification).toHaveProperty('itemType');
                (0, globals_1.expect)(verification).toHaveProperty('leafHash');
                (0, globals_1.expect)(verification.valid).toBe(true);
            }
        });
        (0, globals_1.it)('should return 404 for non-existent manifest', async () => {
            try {
                await client.post('/manifest/verify', {
                    manifestId: 'manifest_nonexistent',
                });
                (0, globals_1.expect)(true).toBe(false);
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(404);
            }
        });
    });
    (0, globals_1.describe)('POST /proof/verify', () => {
        let merkleRoot;
        let leafHash;
        let proof;
        (0, globals_1.beforeAll)(async () => {
            const response = await client.post('/manifest/export', {
                caseId: testCaseId,
            });
            merkleRoot = response.data.merkleRoot;
            leafHash = response.data.proofs[0].leafHash;
            proof = response.data.proofs[0].proof;
        });
        (0, globals_1.it)('should verify valid Merkle proof', async () => {
            const response = await client.post('/proof/verify', {
                leafHash,
                proof,
                merkleRoot,
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.valid).toBe(true);
            (0, globals_1.expect)(response.data.leafHash).toBe(leafHash);
            (0, globals_1.expect)(response.data.merkleRoot).toBe(merkleRoot);
            (0, globals_1.expect)(response.data.proofLength).toBe(proof.length);
        });
        (0, globals_1.it)('should reject invalid proof', async () => {
            // Modify the leaf hash
            const invalidLeaf = 'x'.repeat(64);
            const response = await client.post('/proof/verify', {
                leafHash: invalidLeaf,
                proof,
                merkleRoot,
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.valid).toBe(false);
        });
        (0, globals_1.it)('should reject proof with wrong merkle root', async () => {
            const wrongRoot = 'y'.repeat(64);
            const response = await client.post('/proof/verify', {
                leafHash,
                proof,
                merkleRoot: wrongRoot,
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.valid).toBe(false);
        });
    });
    (0, globals_1.describe)('GET /bundles/:caseId (enhanced)', () => {
        (0, globals_1.it)('should return merkle proofs in bundle', async () => {
            const response = await client.get(`/bundles/${testCaseId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.version).toBe('2.0');
            (0, globals_1.expect)(response.data).toHaveProperty('merkleProofs');
            (0, globals_1.expect)(Array.isArray(response.data.merkleProofs)).toBe(true);
            // Each evidence should have a proof
            (0, globals_1.expect)(response.data.merkleProofs.length).toBe(response.data.evidence.length);
            for (const proof of response.data.merkleProofs) {
                (0, globals_1.expect)(proof).toHaveProperty('evidenceId');
                (0, globals_1.expect)(proof).toHaveProperty('leafHash');
                (0, globals_1.expect)(proof).toHaveProperty('proof');
            }
        });
        (0, globals_1.it)('should allow verification of individual evidence in bundle', async () => {
            const bundleResponse = await client.get(`/bundles/${testCaseId}`);
            const bundle = bundleResponse.data;
            // Verify first evidence proof
            const firstProof = bundle.merkleProofs[0];
            const verifyResponse = await client.post('/proof/verify', {
                leafHash: firstProof.leafHash,
                proof: firstProof.proof,
                merkleRoot: bundle.merkleRoot,
            });
            (0, globals_1.expect)(verifyResponse.data.valid).toBe(true);
        });
    });
});
