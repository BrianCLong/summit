"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const authorization_js_1 = __importDefault(require("../../middleware/authorization.js"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((req, _res, next) => {
    const role = req.headers['x-user-role'];
    if (role) {
        req.user = { role: String(role).toUpperCase() };
    }
    next();
});
app.post('/entities', (0, authorization_js_1.default)('write_graph'), (_req, res) => {
    res.status(201).json({ ok: true });
});
app.post('/maestro/runs', (0, authorization_js_1.default)('run_maestro'), (_req, res) => {
    res.status(202).json({ runId: 'run-123' });
});
app.get('/admin/users', (0, authorization_js_1.default)('manage_users'), (_req, res) => {
    res.json({ users: [] });
});
(0, globals_1.describe)('authorization guard integration', () => {
    (0, globals_1.it)('blocks IntelGraph writes when unauthenticated or unauthorized', async () => {
        await (0, supertest_1.default)(app).post('/entities').expect(401);
        await (0, supertest_1.default)(app)
            .post('/entities')
            .set('x-user-role', 'viewer')
            .expect(403);
    });
    (0, globals_1.it)('allows analysts to create IntelGraph entities', async () => {
        await (0, supertest_1.default)(app)
            .post('/entities')
            .set('x-user-role', 'analyst')
            .expect(201);
    });
    (0, globals_1.it)('gates Maestro run operations to operators', async () => {
        await (0, supertest_1.default)(app)
            .post('/maestro/runs')
            .set('x-user-role', 'viewer')
            .expect(403);
        await (0, supertest_1.default)(app)
            .post('/maestro/runs')
            .set('x-user-role', 'operator')
            .expect(202);
    });
    (0, globals_1.it)('protects admin endpoints', async () => {
        await (0, supertest_1.default)(app).get('/admin/users').expect(401);
        await (0, supertest_1.default)(app)
            .get('/admin/users')
            .set('x-user-role', 'analyst')
            .expect(403);
        await (0, supertest_1.default)(app)
            .get('/admin/users')
            .set('x-user-role', 'admin')
            .expect(200);
    });
});
