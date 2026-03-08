"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const supertest_1 = __importDefault(require("supertest"));
const api_docs_js_1 = require("../src/routes/api-docs.js");
// Use process.cwd() since tests run from server directory
const testDir = path_1.default.join(process.cwd(), 'tests');
const fixtureSpecPath = path_1.default.join(process.cwd(), '../openapi/spec.yaml');
(0, globals_1.describe)('API documentation routes', () => {
    const app = (0, express_1.default)();
    (0, globals_1.beforeAll)(async () => {
        app.use('/api/docs', await (0, api_docs_js_1.createApiDocsRouter)({ specPath: fixtureSpecPath }));
    });
    (0, globals_1.it)('serves the OpenAPI spec as JSON with no-store caching', async () => {
        const response = await (0, supertest_1.default)(app).get('/api/docs/openapi.json');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.headers['cache-control']).toBe('no-store');
        (0, globals_1.expect)(response.headers.etag).toMatch(/^W\/"[a-f0-9]{64}"$/);
        (0, globals_1.expect)(response.body.openapi).toMatch(/^3\.0/);
        (0, globals_1.expect)(response.body.info.title).toBe('IntelGraph Platform API');
    });
    (0, globals_1.it)('serves the OpenAPI spec as YAML', async () => {
        const response = await (0, supertest_1.default)(app).get('/api/docs/openapi.yaml');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.headers['content-type']).toContain('application/yaml');
        (0, globals_1.expect)(response.headers.etag).toBeDefined();
        (0, globals_1.expect)(response.text).toContain('openapi: 3.0');
    });
    (0, globals_1.it)('renders Swagger UI for interactive exploration', async () => {
        const response = await (0, supertest_1.default)(app).get('/api/docs');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.text).toContain('SwaggerUIBundle');
        (0, globals_1.expect)(response.text).toContain('/api/docs/openapi.json');
    });
    (0, globals_1.it)('renders ReDoc for reference documentation', async () => {
        const response = await (0, supertest_1.default)(app).get('/api/docs/redoc');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.text).toContain('redoc');
    });
});
(0, globals_1.describe)('API documentation router bootstrap failures', () => {
    (0, globals_1.it)('throws a helpful error when the spec is missing', async () => {
        const missingPath = path_1.default.join(__dirname, '../openapi/does-not-exist.yaml');
        await (0, globals_1.expect)((0, api_docs_js_1.createApiDocsRouter)({ specPath: missingPath })).rejects.toThrow(/does-not-exist\.yaml/);
    });
    (0, globals_1.it)('throws when the spec cannot be parsed as OpenAPI', async () => {
        const invalidSpecPath = path_1.default.join(__dirname, 'fixtures/invalid-openapi.yaml');
        fs_1.default.mkdirSync(path_1.default.dirname(invalidSpecPath), { recursive: true });
        fs_1.default.writeFileSync(invalidSpecPath, 'not: openapi');
        await (0, globals_1.expect)((0, api_docs_js_1.createApiDocsRouter)({ specPath: invalidSpecPath })).rejects.toThrow(/Invalid OpenAPI document/);
        fs_1.default.rmSync(path_1.default.dirname(invalidSpecPath), { recursive: true, force: true });
    });
});
