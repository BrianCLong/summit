"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const sessions_api_js_1 = __importDefault(require("../sessions-api.js"));
const invoke_api_js_1 = __importDefault(require("../invoke-api.js"));
const globals_1 = require("@jest/globals");
// Mock conductor MCP client
globals_1.jest.unstable_mockModule('../../../conductor/mcp/client.js', () => ({
    mcpClient: {
        executeTool: globals_1.jest.fn(async (_server, tool, _args, scopes) => {
            if (!scopes?.includes('mcp:invoke'))
                throw new Error('Insufficient scopes for tool');
            return { ok: true, tool };
        }),
    },
    mcpRegistry: {},
    initializeMCPClient: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('../../../capability-fabric/policy-gate.js', () => ({
    evaluateCapabilityPolicy: globals_1.jest.fn(async () => ({ allow: true, reason: 'allow' })),
}));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('MCP sessions + invoke', () => {
    const app = (0, express_1.default)();
    app.use('/api/maestro/v1', sessions_api_js_1.default);
    app.use('/api/maestro/v1', invoke_api_js_1.default);
    (0, globals_1.it)('creates and uses a session token', async () => {
        // Create session with scope
        const create = await (0, supertest_1.default)(app)
            .post('/api/maestro/v1/runs/r1/mcp/sessions')
            .set('x-actor-scopes', 'mcp:session')
            .send({ scopes: ['mcp:invoke'] })
            .expect(201);
        const token = create.body.token;
        // Invoke with token
        const res = await (0, supertest_1.default)(app)
            .post('/api/maestro/v1/runs/r1/mcp/invoke')
            .set('Authorization', `Bearer ${token}`)
            .send({
            server: 'graphops',
            tool: 'cypher.query',
            args: { q: 'RETURN 1' },
        })
            .expect(200);
        (0, globals_1.expect)(res.body).toHaveProperty('result.ok', true);
    });
    (0, globals_1.it)('denies invoke without scope', async () => {
        const create = await (0, supertest_1.default)(app)
            .post('/api/maestro/v1/runs/r1/mcp/sessions')
            .set('x-actor-scopes', 'mcp:session')
            .send({ scopes: ['foo'] })
            .expect(201);
        const token = create.body.token;
        await (0, supertest_1.default)(app)
            .post('/api/maestro/v1/runs/r1/mcp/invoke')
            .set('Authorization', `Bearer ${token}`)
            .send({
            server: 'graphops',
            tool: 'cypher.query',
            args: { q: 'RETURN 1' },
        })
            .expect(403);
    });
});
