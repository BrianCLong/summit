"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const graphqlPersistedAllowlist_js_1 = require("../src/middleware/graphqlPersistedAllowlist.js");
// Use process.cwd() since tests run from server directory
const testsDir = path_1.default.join(process.cwd(), 'tests');
const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? globals_1.describe : globals_1.describe.skip;
describeIf('GraphqlPersistedAllowlistMiddleware', () => {
    const manifestPath = path_1.default.join(testsDir, 'tmp-manifest.json');
    const secondaryManifestPath = path_1.default.join(testsDir, 'tmp-secondary-manifest.json');
    const query = 'query Test { __typename }';
    const operationId = 'operation-id-123';
    const apqHash = (0, graphqlPersistedAllowlist_js_1.hashPersistedQuery)(query);
    (0, globals_1.beforeAll)(() => {
        fs_1.default.writeFileSync(manifestPath, JSON.stringify({ [operationId]: query }));
        fs_1.default.writeFileSync(secondaryManifestPath, JSON.stringify({ secondaryOp: 'query Secondary { health }' }));
    });
    (0, globals_1.afterAll)(() => {
        fs_1.default.rmSync(manifestPath, { force: true });
        fs_1.default.rmSync(secondaryManifestPath, { force: true });
    });
    function buildApp({ enforceInProduction = true, allowDevFallback = false, }) {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/graphql', (0, graphqlPersistedAllowlist_js_1.createGraphqlPersistedAllowlistMiddleware)({
            manifestPaths: [secondaryManifestPath, manifestPath],
            enforceInProduction,
            allowDevFallback,
        }), (req, res) => res.json({ ok: true, query: req.body.query }));
        return app;
    }
    (0, globals_1.it)('allows persisted operation by id and injects query', async () => {
        const app = buildApp({ enforceInProduction: true });
        const res = await (0, supertest_1.default)(app).post('/graphql').send({ id: operationId });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.query).toBe(query);
    });
    (0, globals_1.it)('allows APQ hash lookups', async () => {
        const app = buildApp({ enforceInProduction: true });
        const res = await (0, supertest_1.default)(app)
            .post('/graphql')
            .send({
            extensions: { persistedQuery: { sha256Hash: apqHash } },
        });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.query).toBe(query);
    });
    (0, globals_1.it)('rejects unknown queries when enforcement enabled', async () => {
        const app = buildApp({ enforceInProduction: true });
        const res = await (0, supertest_1.default)(app)
            .post('/graphql')
            .send({ query: 'query Unknown { health }' });
        (0, globals_1.expect)(res.status).toBe(403);
        (0, globals_1.expect)(res.body.errors?.[0]?.extensions?.code).toBe('PERSISTED_QUERY_REQUIRED');
    });
    (0, globals_1.it)('falls back to allowing raw queries when dev fallback is enabled', async () => {
        const app = buildApp({ enforceInProduction: false, allowDevFallback: true });
        const res = await (0, supertest_1.default)(app)
            .post('/graphql')
            .send({ query: 'query DevOnly { hello }' });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.ok).toBe(true);
    });
    (0, globals_1.it)('supports GET persisted query lookups via query params', async () => {
        const app = buildApp({ enforceInProduction: true });
        const res = await (0, supertest_1.default)(app)
            .get('/graphql')
            .query({ id: operationId });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.query).toBe(query);
    });
    (0, globals_1.it)('merges multiple manifest files', async () => {
        const app = buildApp({ enforceInProduction: true });
        const res = await (0, supertest_1.default)(app)
            .get('/graphql')
            .query({ id: 'secondaryOp' });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.query).toBe('query Secondary { health }');
    });
});
