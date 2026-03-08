"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const servers_api_js_1 = __importDefault(require("../servers-api.js"));
const globals_1 = require("@jest/globals");
const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? globals_1.describe.skip : globals_1.describe;
// Mock the repo to avoid DB
globals_1.jest.unstable_mockModule('../MCPServersRepo.js', () => ({
    mcpServersRepo: {
        create: globals_1.jest.fn(async (input) => ({
            id: 's1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            auth_token: input.authToken ?? null,
            scopes: input.scopes ?? [],
            tags: input.tags ?? [],
            name: input.name,
            url: input.url,
        })),
        list: globals_1.jest.fn(async () => [
            {
                id: 's1',
                name: 'local-graphops',
                url: 'ws://localhost:9010',
                auth_token: null,
                scopes: ['graph:read'],
                tags: ['local'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ]),
        get: globals_1.jest.fn(async (id) => id === 's1'
            ? {
                id: 's1',
                name: 'local-graphops',
                url: 'ws://localhost:9010',
                auth_token: null,
                scopes: ['graph:read'],
                tags: ['local'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
            : null),
        update: globals_1.jest.fn(async (id, input) => id === 's1'
            ? {
                id: 's1',
                name: input.name ?? 'local-graphops',
                url: input.url ?? 'ws://localhost:9010',
                auth_token: input.authToken ?? null,
                scopes: input.scopes ?? ['graph:read'],
                tags: input.tags ?? ['local'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
            : null),
        delete: globals_1.jest.fn(async (id) => id === 's1'),
    },
}));
describeIf('MCP Servers API', () => {
    const app = (0, express_1.default)();
    app.use('/api/maestro/v1/mcp', servers_api_js_1.default);
    (0, globals_1.it)('creates an MCP server', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/maestro/v1/mcp/servers')
            .send({
            name: 'local-graphops',
            url: 'ws://localhost:9001',
            scopes: ['graph:read'],
        })
            .expect(201);
        (0, globals_1.expect)(res.body).toHaveProperty('id');
        (0, globals_1.expect)(res.body).toHaveProperty('name', 'local-graphops');
        (0, globals_1.expect)(res.body).not.toHaveProperty('auth_token');
    });
    (0, globals_1.it)('lists servers', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/api/maestro/v1/mcp/servers')
            .expect(200);
        (0, globals_1.expect)(Array.isArray(res.body)).toBe(true);
        (0, globals_1.expect)(res.body[0]).toHaveProperty('name');
    });
    (0, globals_1.it)('gets a server by id', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/api/maestro/v1/mcp/servers/s1')
            .expect(200);
        (0, globals_1.expect)(res.body).toHaveProperty('id', 's1');
    });
    (0, globals_1.it)('updates a server', async () => {
        const res = await (0, supertest_1.default)(app)
            .put('/api/maestro/v1/mcp/servers/s1')
            .send({ name: 'updated' })
            .expect(200);
        (0, globals_1.expect)(res.body).toHaveProperty('name', 'updated');
    });
    (0, globals_1.it)('deletes a server', async () => {
        await (0, supertest_1.default)(app).delete('/api/maestro/v1/mcp/servers/s1').expect(204);
    });
});
