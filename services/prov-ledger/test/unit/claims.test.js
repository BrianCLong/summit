"use strict";
/**
 * Unit tests for Claims endpoints
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
(0, globals_1.describe)('Claims API', () => {
    (0, globals_1.describe)('POST /claims', () => {
        (0, globals_1.it)('should create a claim with all fields', async () => {
            const claimData = {
                content: {
                    title: 'Test Claim',
                    data: 'sample data',
                },
                metadata: {
                    source: 'test suite',
                },
                sourceRef: 'file://test.txt',
                policyLabels: ['public', 'test'],
            };
            const response = await client.post('/claims', claimData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('id');
            (0, globals_1.expect)(response.data.id).toMatch(/^claim_/);
            (0, globals_1.expect)(response.data).toHaveProperty('hash');
            (0, globals_1.expect)(response.data.content).toEqual(claimData.content);
            (0, globals_1.expect)(response.data.sourceRef).toBe(claimData.sourceRef);
            (0, globals_1.expect)(response.data.policyLabels).toEqual(claimData.policyLabels);
            (0, globals_1.expect)(response.data).toHaveProperty('created_at');
        });
        (0, globals_1.it)('should create a minimal claim', async () => {
            const claimData = {
                content: {
                    data: 'minimal test',
                },
            };
            const response = await client.post('/claims', claimData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('id');
            (0, globals_1.expect)(response.data.policyLabels).toEqual([]);
        });
        (0, globals_1.it)('should fail without required content', async () => {
            try {
                await client.post('/claims', {});
                (0, globals_1.expect)(true).toBe(false); // Should not reach here
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(400);
            }
        });
        (0, globals_1.it)('should fail without authority headers', async () => {
            const noAuthClient = axios_1.default.create({
                baseURL: BASE_URL,
            });
            try {
                await noAuthClient.post('/claims', {
                    content: { test: 'data' },
                });
                (0, globals_1.expect)(true).toBe(false); // Should not reach here
            }
            catch (error) {
                (0, globals_1.expect)([403, 500]).toContain(error.response.status);
            }
        });
    });
    (0, globals_1.describe)('GET /claims/:id', () => {
        let testClaimId;
        (0, globals_1.beforeAll)(async () => {
            // Create a test claim
            const response = await client.post('/claims', {
                content: { test: 'get claim test' },
            });
            testClaimId = response.data.id;
        });
        (0, globals_1.it)('should retrieve an existing claim', async () => {
            const response = await client.get(`/claims/${testClaimId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.id).toBe(testClaimId);
            (0, globals_1.expect)(response.data).toHaveProperty('hash');
            (0, globals_1.expect)(response.data).toHaveProperty('created_at');
        });
        (0, globals_1.it)('should return 404 for non-existent claim', async () => {
            try {
                await client.get('/claims/claim_nonexistent');
                (0, globals_1.expect)(true).toBe(false); // Should not reach here
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(404);
                (0, globals_1.expect)(error.response.data).toHaveProperty('error');
            }
        });
    });
    (0, globals_1.describe)('Hash consistency', () => {
        (0, globals_1.it)('should generate the same hash for identical content', async () => {
            const content = {
                data: 'identical content',
                value: 123,
            };
            const response1 = await client.post('/claims', { content });
            const response2 = await client.post('/claims', { content });
            // Hashes should be the same
            (0, globals_1.expect)(response1.data.hash).toBe(response2.data.hash);
            // But IDs should be different
            (0, globals_1.expect)(response1.data.id).not.toBe(response2.data.id);
        });
    });
});
