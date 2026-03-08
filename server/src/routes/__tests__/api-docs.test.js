"use strict";
/**
 * API Documentation Routes Tests
 * Issue: #11814 - API Documentation with OpenAPI/Swagger
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const globals_1 = require("@jest/globals");
const api_docs_js_1 = require("../api-docs.js");
const specPath = node_path_1.default.resolve(process.cwd(), 'openapi', 'spec.yaml');
const runNetwork = process.env.NO_NETWORK_LISTEN !== 'true' && node_fs_1.default.existsSync(specPath);
const describeIf = runNetwork ? globals_1.describe : globals_1.describe.skip;
describeIf('API Documentation Routes', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        app = (0, express_1.default)();
        const router = await (0, api_docs_js_1.createApiDocsRouter)({ specPath });
        app.use('/api/docs', router);
    });
    (0, globals_1.describe)('GET /api/docs', () => {
        (0, globals_1.it)('should return Swagger UI HTML', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/docs');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.headers['content-type']).toContain('text/html');
            (0, globals_1.expect)(response.text).toContain('IntelGraph API Explorer');
            (0, globals_1.expect)(response.text).toContain('swagger-ui');
        });
    });
    (0, globals_1.describe)('GET /api/docs/redoc', () => {
        (0, globals_1.it)('should return ReDoc HTML', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/docs/redoc');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.headers['content-type']).toContain('text/html');
            (0, globals_1.expect)(response.text).toContain('redoc');
        });
    });
    (0, globals_1.describe)('GET /api/docs/openapi.json', () => {
        (0, globals_1.it)('should return OpenAPI specification as JSON', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/docs/openapi.json');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.headers['content-type']).toContain('application/json');
            (0, globals_1.expect)(response.body).toHaveProperty('openapi');
            (0, globals_1.expect)(response.body).toHaveProperty('info');
            (0, globals_1.expect)(response.body).toHaveProperty('paths');
            (0, globals_1.expect)(response.body.info.title).toContain('IntelGraph');
        });
    });
    (0, globals_1.describe)('GET /api/docs/openapi.yaml', () => {
        (0, globals_1.it)('should return OpenAPI specification as YAML', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/docs/openapi.yaml');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.headers['content-type']).toContain('text/yaml');
            (0, globals_1.expect)(response.text).toContain('openapi:');
            (0, globals_1.expect)(response.text).toContain('paths:');
        });
    });
});
