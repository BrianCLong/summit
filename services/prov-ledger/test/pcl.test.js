"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fastify_1 = __importDefault(require("fastify"));
const pcl_1 = __importDefault(require("../src/routes/pcl"));
const LedgerService_1 = require("../src/services/LedgerService");
(0, globals_1.describe)('PCL Service', () => {
    let server;
    (0, globals_1.beforeAll)(async () => {
        server = (0, fastify_1.default)();
        server.register(pcl_1.default);
        await server.ready();
        LedgerService_1.LedgerService.getInstance()._reset();
    });
    (0, globals_1.afterAll)(async () => {
        await server.close();
    });
    (0, globals_1.it)('should register evidence and return an ID', async () => {
        const res = await server.inject({
            method: 'POST',
            url: '/evidence',
            payload: {
                source: 'http://example.com/file.pdf',
                hash: 'sha256:abc123456',
                caseId: 'bundle_test_1'
            }
        });
        (0, globals_1.expect)(res.statusCode).toBe(201);
        const body = JSON.parse(res.payload);
        (0, globals_1.expect)(body.evidenceId).toMatch(/^ev_/);
    });
    (0, globals_1.it)('should register a transform', async () => {
        const res = await server.inject({
            method: 'POST',
            url: '/transform',
            payload: {
                inputs: ['ev_123'],
                tool: 'ocr-v1',
                params: { lang: 'en' },
                outputs: ['ev_456'],
                operatorId: 'user_1',
                caseId: 'bundle_test_1'
            }
        });
        (0, globals_1.expect)(res.statusCode).toBe(201);
        const body = JSON.parse(res.payload);
        (0, globals_1.expect)(body.transformId).toMatch(/^tx_/);
    });
    (0, globals_1.it)('should register a claim', async () => {
        const res = await server.inject({
            method: 'POST',
            url: '/claim',
            payload: {
                subject: 'person:bob',
                predicate: 'is_author_of',
                object: 'doc:report.pdf',
                evidenceRefs: ['ev_456'],
                confidence: 0.95,
                licenseId: 'lic_cc_by',
                caseId: 'bundle_test_1'
            }
        });
        (0, globals_1.expect)(res.statusCode).toBe(201);
        const body = JSON.parse(res.payload);
        (0, globals_1.expect)(body.claimId).toMatch(/^cl_/);
    });
    (0, globals_1.it)('should generate a verifiable manifest', async () => {
        const res = await server.inject({
            method: 'GET',
            url: '/manifest/bundle_test_1'
        });
        (0, globals_1.expect)(res.statusCode).toBe(200);
        const manifest = JSON.parse(res.payload);
        (0, globals_1.expect)(manifest.bundleId).toBe('bundle_test_1');
        (0, globals_1.expect)(manifest.entries.length).toBeGreaterThan(0);
        (0, globals_1.expect)(manifest.merkleRoot).toBeDefined();
        // Verify integrity roughly
        const lastEntry = manifest.entries[manifest.entries.length - 1];
        (0, globals_1.expect)(lastEntry.hash).toBe(manifest.merkleRoot);
    });
});
