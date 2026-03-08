"use strict";
/**
 * Unit tests for Transform registration endpoints
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
(0, globals_1.describe)('Transforms API', () => {
    (0, globals_1.describe)('POST /transform/register', () => {
        (0, globals_1.it)('should register a transform with all fields', async () => {
            const transformData = {
                transformType: 'ocr',
                inputHash: 'a'.repeat(64),
                outputHash: 'b'.repeat(64),
                algorithm: 'tesseract',
                version: '5.0.0',
                parameters: { language: 'eng', dpi: 300 },
                durationMs: 1500,
                confidence: 0.95,
            };
            const response = await client.post('/transform/register', transformData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('id');
            (0, globals_1.expect)(response.data.id).toMatch(/^tx_/);
            (0, globals_1.expect)(response.data.transformType).toBe('ocr');
            (0, globals_1.expect)(response.data.inputHash).toBe(transformData.inputHash);
            (0, globals_1.expect)(response.data.outputHash).toBe(transformData.outputHash);
            (0, globals_1.expect)(response.data.algorithm).toBe('tesseract');
            (0, globals_1.expect)(response.data.version).toBe('5.0.0');
            (0, globals_1.expect)(response.data.durationMs).toBe(1500);
            (0, globals_1.expect)(response.data.confidence).toBe(0.95);
        });
        (0, globals_1.it)('should register a transform with minimal fields', async () => {
            const transformData = {
                transformType: 'redaction',
                inputHash: 'c'.repeat(64),
                outputHash: 'd'.repeat(64),
                algorithm: 'regex-mask',
                version: '1.0.0',
                durationMs: 50,
            };
            const response = await client.post('/transform/register', transformData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.transformType).toBe('redaction');
            (0, globals_1.expect)(response.data.confidence).toBeNull();
        });
        (0, globals_1.it)('should register transform with parent transforms', async () => {
            // Register first transform
            const response1 = await client.post('/transform/register', {
                transformType: 'extraction',
                inputHash: 'e'.repeat(64),
                outputHash: 'f'.repeat(64),
                algorithm: 'pdf-extract',
                version: '2.0.0',
                durationMs: 200,
            });
            const parentId = response1.data.id;
            // Register child transform
            const response2 = await client.post('/transform/register', {
                transformType: 'analysis',
                inputHash: 'f'.repeat(64), // Input matches parent output
                outputHash: 'g'.repeat(64),
                algorithm: 'nlp-analysis',
                version: '3.0.0',
                durationMs: 500,
                parentTransforms: [parentId],
            });
            (0, globals_1.expect)(response2.status).toBe(200);
            (0, globals_1.expect)(response2.data.id).toMatch(/^tx_/);
        });
        (0, globals_1.it)('should validate confidence is between 0 and 1', async () => {
            // Valid confidence
            const validResponse = await client.post('/transform/register', {
                transformType: 'classification',
                inputHash: 'h'.repeat(64),
                outputHash: 'i'.repeat(64),
                algorithm: 'ml-classifier',
                version: '1.0.0',
                durationMs: 100,
                confidence: 0.85,
            });
            (0, globals_1.expect)(validResponse.status).toBe(200);
            // Boundary values
            const zeroConfidence = await client.post('/transform/register', {
                transformType: 'classification',
                inputHash: 'j'.repeat(64),
                outputHash: 'k'.repeat(64),
                algorithm: 'ml-classifier',
                version: '1.0.0',
                durationMs: 100,
                confidence: 0,
            });
            (0, globals_1.expect)(zeroConfidence.status).toBe(200);
            const fullConfidence = await client.post('/transform/register', {
                transformType: 'classification',
                inputHash: 'l'.repeat(64),
                outputHash: 'm'.repeat(64),
                algorithm: 'ml-classifier',
                version: '1.0.0',
                durationMs: 100,
                confidence: 1,
            });
            (0, globals_1.expect)(fullConfidence.status).toBe(200);
        });
    });
    (0, globals_1.describe)('GET /transform/:id', () => {
        let testTransformId;
        (0, globals_1.beforeAll)(async () => {
            const response = await client.post('/transform/register', {
                transformType: 'test-transform',
                inputHash: 'n'.repeat(64),
                outputHash: 'o'.repeat(64),
                algorithm: 'test-algo',
                version: '1.0.0',
                durationMs: 100,
                parameters: { test: true },
                metadata: { purpose: 'test retrieval' },
            });
            testTransformId = response.data.id;
        });
        (0, globals_1.it)('should retrieve existing transform', async () => {
            const response = await client.get(`/transform/${testTransformId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.id).toBe(testTransformId);
            (0, globals_1.expect)(response.data.transformType).toBe('test-transform');
            (0, globals_1.expect)(response.data.parameters).toEqual({ test: true });
            (0, globals_1.expect)(response.data).toHaveProperty('executionTimestamp');
            (0, globals_1.expect)(response.data).toHaveProperty('executedBy');
        });
        (0, globals_1.it)('should return 404 for non-existent transform', async () => {
            try {
                await client.get('/transform/tx_nonexistent');
                (0, globals_1.expect)(true).toBe(false);
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(404);
            }
        });
    });
});
