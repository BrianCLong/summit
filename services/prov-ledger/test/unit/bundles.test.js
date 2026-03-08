"use strict";
/**
 * Unit tests for Bundle endpoints
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
(0, globals_1.describe)('Bundles API', () => {
    let testCaseId;
    let evidenceIds = [];
    (0, globals_1.beforeAll)(async () => {
        // Create a test case
        testCaseId = 'case_bundle_test_' + Date.now();
        await pool.query(`INSERT INTO cases (id, title, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5)`, [testCaseId, 'Test Case for Bundles', 'Test description', 'active', TEST_AUTHORITY]);
        // Register multiple evidence items for the case
        const evidenceData = [
            {
                sourceRef: 'file://evidence-001.pdf',
                checksum: 'checksum_bundle_1_' + Date.now(),
                transformChain: [
                    {
                        transformType: 'extraction',
                        timestamp: new Date().toISOString(),
                        actorId: 'system',
                    },
                ],
            },
            {
                sourceRef: 'file://evidence-002.jpg',
                checksum: 'checksum_bundle_2_' + Date.now(),
                transformChain: [
                    {
                        transformType: 'enhancement',
                        timestamp: new Date().toISOString(),
                        actorId: 'analyst',
                    },
                ],
            },
            {
                sourceRef: 'file://evidence-003.doc',
                checksum: 'checksum_bundle_3_' + Date.now(),
                transformChain: [],
            },
        ];
        for (const data of evidenceData) {
            const response = await client.post('/evidence', {
                caseId: testCaseId,
                ...data,
            });
            evidenceIds.push(response.data.id);
        }
    });
    (0, globals_1.describe)('GET /bundles/:caseId', () => {
        (0, globals_1.it)('should generate disclosure bundle for a case', async () => {
            const response = await client.get(`/bundles/${testCaseId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.caseId).toBe(testCaseId);
            (0, globals_1.expect)(response.data.version).toBe('1.0');
            (0, globals_1.expect)(response.data.evidence).toHaveLength(3);
            (0, globals_1.expect)(response.data).toHaveProperty('hashTree');
            (0, globals_1.expect)(response.data).toHaveProperty('merkleRoot');
            (0, globals_1.expect)(response.data).toHaveProperty('generated_at');
        });
        (0, globals_1.it)('should include all evidence with checksums and transform chains', async () => {
            const response = await client.get(`/bundles/${testCaseId}`);
            const bundle = response.data;
            // Verify each evidence item
            bundle.evidence.forEach((item) => {
                (0, globals_1.expect)(item).toHaveProperty('id');
                (0, globals_1.expect)(item).toHaveProperty('sourceRef');
                (0, globals_1.expect)(item).toHaveProperty('checksum');
                (0, globals_1.expect)(item).toHaveProperty('transformChain');
                (0, globals_1.expect)(Array.isArray(item.transformChain)).toBe(true);
            });
        });
        (0, globals_1.it)('should build correct hash tree', async () => {
            const response = await client.get(`/bundles/${testCaseId}`);
            const bundle = response.data;
            (0, globals_1.expect)(bundle.hashTree).toHaveLength(3);
            (0, globals_1.expect)(Array.isArray(bundle.hashTree)).toBe(true);
            // All entries should be hex strings
            bundle.hashTree.forEach((hash) => {
                (0, globals_1.expect)(typeof hash).toBe('string');
                (0, globals_1.expect)(hash.length).toBeGreaterThan(0);
            });
        });
        (0, globals_1.it)('should compute merkle root', async () => {
            const response = await client.get(`/bundles/${testCaseId}`);
            const bundle = response.data;
            (0, globals_1.expect)(bundle.merkleRoot).toBeTruthy();
            (0, globals_1.expect)(typeof bundle.merkleRoot).toBe('string');
            // Merkle root should be a hash (64 hex chars for SHA-256)
            (0, globals_1.expect)(bundle.merkleRoot).toMatch(/^[a-f0-9]+$/);
        });
        (0, globals_1.it)('should return 404 for non-existent case', async () => {
            try {
                await client.get('/bundles/case_nonexistent');
                (0, globals_1.expect)(true).toBe(false); // Should not reach here
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(404);
                (0, globals_1.expect)(error.response.data.error).toContain('not found');
            }
        });
        (0, globals_1.it)('should handle case with no evidence', async () => {
            // Create a case with no evidence
            const emptyCaseId = 'case_empty_' + Date.now();
            await pool.query(`INSERT INTO cases (id, title, status, created_by)
         VALUES ($1, $2, $3, $4)`, [emptyCaseId, 'Empty Case', 'active', TEST_AUTHORITY]);
            const response = await client.get(`/bundles/${emptyCaseId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.evidence).toHaveLength(0);
            (0, globals_1.expect)(response.data.hashTree).toHaveLength(0);
            (0, globals_1.expect)(response.data.merkleRoot).toBe('');
        });
    });
    (0, globals_1.describe)('Bundle verification', () => {
        (0, globals_1.it)('should allow verification of evidence in bundle', async () => {
            const bundleResponse = await client.get(`/bundles/${testCaseId}`);
            const bundle = bundleResponse.data;
            // Pick first evidence
            const evidence = bundle.evidence[0];
            // Get the full evidence details
            const evidenceResponse = await client.get(`/evidence/${evidence.id}`);
            const fullEvidence = evidenceResponse.data;
            // Verify checksum matches
            (0, globals_1.expect)(fullEvidence.checksum).toBe(evidence.checksum);
            // Verify it's in the hash tree
            (0, globals_1.expect)(bundle.hashTree).toContain(evidence.checksum);
        });
    });
});
