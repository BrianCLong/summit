"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fastify_1 = __importDefault(require("fastify"));
const pcl_1 = __importDefault(require("../src/routes/pcl"));
const LedgerService_1 = require("../src/services/LedgerService");
(0, globals_1.describe)('PCL Routes', () => {
    let server;
    (0, globals_1.beforeAll)(async () => {
        server = (0, fastify_1.default)();
        server.register(pcl_1.default);
        await server.ready();
    });
    (0, globals_1.beforeEach)(async () => {
        await LedgerService_1.LedgerService.getInstance()._reset();
    });
    (0, globals_1.afterAll)(async () => {
        await server.close();
    });
    (0, globals_1.it)('should accept caseId in input and export bundle', async () => {
        const caseId = 'case-route-1';
        // Create Evidence with caseId
        const res1 = await server.inject({
            method: 'POST',
            url: '/evidence',
            payload: {
                source: 's1',
                hash: 'h1',
                caseId
            }
        });
        (0, globals_1.expect)(res1.statusCode).toBe(201);
        // Export Bundle
        const res2 = await server.inject({
            method: 'GET',
            url: `/bundle/${caseId}/export`
        });
        (0, globals_1.expect)(res2.statusCode).toBe(200);
        const bundle = JSON.parse(res2.payload);
        (0, globals_1.expect)(bundle.bundleId).toBe(caseId);
        (0, globals_1.expect)(bundle.entries).toHaveLength(1);
    });
});
