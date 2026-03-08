"use strict";
/**
 * Unit tests for Source registration endpoints
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
(0, globals_1.describe)('Sources API', () => {
    (0, globals_1.describe)('POST /source/register', () => {
        (0, globals_1.it)('should register a source with content hash computed', async () => {
            const sourceData = {
                sourceType: 'document',
                content: 'test document content for hashing',
                originUrl: 'https://example.com/doc.pdf',
                metadata: { title: 'Test Document' },
            };
            const response = await client.post('/source/register', sourceData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('id');
            (0, globals_1.expect)(response.data.id).toMatch(/^src_/);
            (0, globals_1.expect)(response.data).toHaveProperty('sourceHash');
            (0, globals_1.expect)(response.data.sourceHash).toMatch(/^[a-f0-9]{64}$/);
            (0, globals_1.expect)(response.data.sourceType).toBe('document');
        });
        (0, globals_1.it)('should register a source with provided hash', async () => {
            const sourceHash = 'a'.repeat(64); // Mock SHA-256 hash
            const sourceData = {
                sourceType: 'api',
                sourceHash,
                originUrl: 'https://api.example.com/data',
            };
            const response = await client.post('/source/register', sourceData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.sourceHash).toBe(sourceHash);
            (0, globals_1.expect)(response.data.sourceType).toBe('api');
        });
        (0, globals_1.it)('should return idempotent response for duplicate hash', async () => {
            const content = 'unique-idempotent-content-' + Date.now();
            const sourceData = {
                sourceType: 'document',
                content,
            };
            // First registration
            const response1 = await client.post('/source/register', sourceData);
            (0, globals_1.expect)(response1.status).toBe(200);
            const originalId = response1.data.id;
            // Second registration with same content
            const response2 = await client.post('/source/register', sourceData);
            (0, globals_1.expect)(response2.status).toBe(200);
            (0, globals_1.expect)(response2.data.idempotent).toBe(true);
            (0, globals_1.expect)(response2.data.id).toBe(originalId);
        });
        (0, globals_1.it)('should fail without hash or content', async () => {
            try {
                await client.post('/source/register', {
                    sourceType: 'document',
                });
                (0, globals_1.expect)(true).toBe(false); // Should not reach here
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(400);
                (0, globals_1.expect)(error.response.data.error).toContain('sourceHash or content');
            }
        });
        (0, globals_1.it)('should accept all valid source types', async () => {
            const sourceTypes = ['document', 'database', 'api', 'user_input', 'sensor'];
            for (const sourceType of sourceTypes) {
                const response = await client.post('/source/register', {
                    sourceType,
                    content: `content-for-${sourceType}-${Date.now()}`,
                });
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.data.sourceType).toBe(sourceType);
            }
        });
        (0, globals_1.it)('should track license and retention policy', async () => {
            const sourceData = {
                sourceType: 'document',
                content: 'licensed content ' + Date.now(),
                licenseId: 'license-internal',
                retentionPolicy: 'EXTENDED',
            };
            const response = await client.post('/source/register', sourceData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.licenseId).toBe('license-internal');
        });
    });
    (0, globals_1.describe)('GET /source/:id', () => {
        let testSourceId;
        (0, globals_1.beforeAll)(async () => {
            const response = await client.post('/source/register', {
                sourceType: 'document',
                content: 'test-get-source-' + Date.now(),
                originUrl: 'https://example.com/test',
                metadata: { purpose: 'test retrieval' },
            });
            testSourceId = response.data.id;
        });
        (0, globals_1.it)('should retrieve existing source', async () => {
            const response = await client.get(`/source/${testSourceId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.id).toBe(testSourceId);
            (0, globals_1.expect)(response.data).toHaveProperty('sourceHash');
            (0, globals_1.expect)(response.data).toHaveProperty('sourceType');
            (0, globals_1.expect)(response.data).toHaveProperty('created_at');
        });
        (0, globals_1.it)('should return 404 for non-existent source', async () => {
            try {
                await client.get('/source/src_nonexistent');
                (0, globals_1.expect)(true).toBe(false);
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(404);
            }
        });
    });
});
