"use strict";
/**
 * Unit tests for Evidence endpoints
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
(0, globals_1.describe)('Evidence API', () => {
    let testCaseId;
    (0, globals_1.beforeAll)(async () => {
        // Create a test case directly in DB or use a fixed ID
        testCaseId = 'case_test_' + Date.now();
    });
    (0, globals_1.describe)('POST /evidence', () => {
        (0, globals_1.it)('should register evidence with all fields', async () => {
            const evidenceData = {
                sourceRef: 'file://evidence-001.pdf',
                checksum: 'abc123def456',
                checksumAlgorithm: 'sha256',
                contentType: 'application/pdf',
                fileSize: 1024,
                transformChain: [
                    {
                        transformType: 'extraction',
                        timestamp: new Date().toISOString(),
                        actorId: 'system',
                        config: { method: 'ocr' },
                    },
                ],
                policyLabels: ['confidential', 'legal'],
                metadata: {
                    source: 'document scanner',
                },
            };
            const response = await client.post('/evidence', evidenceData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('id');
            (0, globals_1.expect)(response.data.id).toMatch(/^evidence_/);
            (0, globals_1.expect)(response.data.sourceRef).toBe(evidenceData.sourceRef);
            (0, globals_1.expect)(response.data.checksum).toBe(evidenceData.checksum);
            (0, globals_1.expect)(response.data.checksumAlgorithm).toBe(evidenceData.checksumAlgorithm);
            (0, globals_1.expect)(response.data.transformChain).toHaveLength(1);
            (0, globals_1.expect)(response.data.policyLabels).toEqual(evidenceData.policyLabels);
        });
        (0, globals_1.it)('should compute checksum from content if not provided', async () => {
            const evidenceData = {
                sourceRef: 'inline://data',
                content: 'test content for checksum',
            };
            const response = await client.post('/evidence', evidenceData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('checksum');
            (0, globals_1.expect)(response.data.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
        });
        (0, globals_1.it)('should register evidence linked to a case', async () => {
            const evidenceData = {
                caseId: testCaseId,
                sourceRef: 'file://case-evidence.jpg',
                checksum: 'xyz789abc',
            };
            const response = await client.post('/evidence', evidenceData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.caseId).toBe(testCaseId);
        });
        (0, globals_1.it)('should fail without sourceRef', async () => {
            try {
                await client.post('/evidence', {
                    checksum: 'abc123',
                });
                (0, globals_1.expect)(true).toBe(false); // Should not reach here
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(400);
            }
        });
        (0, globals_1.it)('should fail without checksum or content', async () => {
            try {
                await client.post('/evidence', {
                    sourceRef: 'file://test',
                });
                (0, globals_1.expect)(true).toBe(false); // Should not reach here
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(400);
            }
        });
        (0, globals_1.it)('should return 409 for duplicate checksum', async () => {
            const checksum = 'unique_checksum_' + Date.now();
            // First registration should succeed
            await client.post('/evidence', {
                sourceRef: 'file://first.txt',
                checksum,
            });
            // Second registration with same checksum should fail
            try {
                await client.post('/evidence', {
                    sourceRef: 'file://second.txt',
                    checksum,
                });
                (0, globals_1.expect)(true).toBe(false); // Should not reach here
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(409);
                (0, globals_1.expect)(error.response.data.error).toContain('already exists');
            }
        });
    });
    (0, globals_1.describe)('GET /evidence/:id', () => {
        let testEvidenceId;
        (0, globals_1.beforeAll)(async () => {
            const response = await client.post('/evidence', {
                sourceRef: 'file://test-get.txt',
                checksum: 'test_get_' + Date.now(),
            });
            testEvidenceId = response.data.id;
        });
        (0, globals_1.it)('should retrieve existing evidence', async () => {
            const response = await client.get(`/evidence/${testEvidenceId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.id).toBe(testEvidenceId);
            (0, globals_1.expect)(response.data).toHaveProperty('checksum');
            (0, globals_1.expect)(response.data).toHaveProperty('created_at');
        });
        (0, globals_1.it)('should return 404 for non-existent evidence', async () => {
            try {
                await client.get('/evidence/evidence_nonexistent');
                (0, globals_1.expect)(true).toBe(false); // Should not reach here
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(404);
            }
        });
    });
    (0, globals_1.describe)('Transform chain validation', () => {
        (0, globals_1.it)('should accept valid transform chain', async () => {
            const evidenceData = {
                sourceRef: 'file://transform-test.doc',
                checksum: 'transform_' + Date.now(),
                transformChain: [
                    {
                        transformType: 'ocr',
                        timestamp: new Date().toISOString(),
                        actorId: 'system',
                    },
                    {
                        transformType: 'redaction',
                        timestamp: new Date().toISOString(),
                        actorId: 'admin-user',
                        config: { method: 'automated' },
                    },
                ],
            };
            const response = await client.post('/evidence', evidenceData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.transformChain).toHaveLength(2);
            (0, globals_1.expect)(response.data.transformChain[0].transformType).toBe('ocr');
            (0, globals_1.expect)(response.data.transformChain[1].transformType).toBe('redaction');
        });
    });
});
