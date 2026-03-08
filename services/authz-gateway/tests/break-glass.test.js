"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const auditLogPath = path_1.default.join(__dirname, '..', 'audit.log');
const breakGlassStatePath = path_1.default.join(__dirname, '..', 'break-glass-state.json');
const breakGlassEventsPath = path_1.default.join(__dirname, '..', 'break-glass-events.log');
function cleanupLogs() {
    [auditLogPath, breakGlassStatePath, breakGlassEventsPath].forEach((file) => {
        if (fs_1.default.existsSync(file)) {
            fs_1.default.unlinkSync(file);
        }
    });
}
async function bootstrap({ ttlSeconds = '60', opaDecision, } = {}) {
    cleanupLogs();
    jest.resetModules();
    process.env.AUTHZ_DEMO_USERNAME = 'alice';
    process.env.AUTHZ_DEMO_PASSWORD = 'password123';
    process.env.BREAK_GLASS_TTL_SECONDS = ttlSeconds;
    const opa = (0, express_1.default)();
    opa.use(express_1.default.json());
    opa.post('/v1/data/summit/abac/decision', (_req, res) => res.json({
        result: opaDecision ?? { allow: true, reason: 'allow', obligations: [] },
    }));
    const opaServer = opa.listen(0);
    const opaPort = opaServer.address().port;
    process.env.OPA_URL = `http://localhost:${opaPort}/v1/data/summit/abac/decision`;
    const upstream = (0, express_1.default)();
    upstream.get('/data', (_req, res) => res.json({ ok: true }));
    const upstreamServer = upstream.listen(0);
    const upstreamPort = upstreamServer.address().port;
    process.env.UPSTREAM = `http://localhost:${upstreamPort}`;
    const { createApp } = await Promise.resolve().then(() => __importStar(require('../src/index')));
    const { stopObservability } = await Promise.resolve().then(() => __importStar(require('../src/observability')));
    const { sessionManager } = await Promise.resolve().then(() => __importStar(require('../src/session')));
    const app = await createApp();
    return { app, opaServer, upstreamServer, stopObservability, sessionManager };
}
async function teardown(servers = [], stopObservability) {
    servers.forEach((server) => server.close());
    if (stopObservability) {
        await stopObservability();
    }
    delete process.env.BREAK_GLASS_TTL_SECONDS;
    delete process.env.OPA_URL;
    delete process.env.UPSTREAM;
    delete process.env.AUTHZ_DEMO_USERNAME;
    delete process.env.AUTHZ_DEMO_PASSWORD;
    jest.resetModules();
    cleanupLogs();
}
describe('break glass access', () => {
    afterAll(() => {
        cleanupLogs();
    });
    it('rejects requests without justification', async () => {
        const { app, opaServer, upstreamServer, stopObservability } = await bootstrap();
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const token = loginRes.body.token;
        const res = await (0, supertest_1.default)(app)
            .post('/access/break-glass/request')
            .set('Authorization', `Bearer ${token}`)
            .send({ ticketId: 'INC-100' });
        expect(res.status).toBe(400);
        await teardown([opaServer, upstreamServer], stopObservability);
    });
    it('issues a short-lived break-glass token, audits usage, and enforces single use', async () => {
        const { app, opaServer, upstreamServer, stopObservability, sessionManager, } = await bootstrap({ ttlSeconds: '5' });
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const baseToken = loginRes.body.token;
        const requestRes = await (0, supertest_1.default)(app)
            .post('/access/break-glass/request')
            .set('Authorization', `Bearer ${baseToken}`)
            .send({ justification: 'prod outage', ticketId: 'INC-42' });
        expect(requestRes.status).toBe(201);
        const { session } = await sessionManager.validate(baseToken);
        const elevatedToken = await sessionManager.elevateSession(session.sid, {
            acr: 'loa2',
            amr: ['mfa'],
        });
        const approvalRes = await (0, supertest_1.default)(app)
            .post('/access/break-glass/approve')
            .set('Authorization', `Bearer ${elevatedToken}`)
            .send({ requestId: requestRes.body.requestId });
        expect(approvalRes.status).toBe(200);
        expect(approvalRes.body.scope).toContain('break_glass:elevated');
        expect(approvalRes.body.singleUse).toBe(true);
        expect(approvalRes.body.immutableExpiry).toBe(true);
        const protectedRes = await (0, supertest_1.default)(app)
            .get('/protected/data')
            .set('Authorization', `Bearer ${approvalRes.body.token}`)
            .set('x-resource-id', 'dataset-alpha');
        expect(protectedRes.status).toBe(200);
        const reuseRes = await (0, supertest_1.default)(app)
            .get('/protected/data')
            .set('Authorization', `Bearer ${approvalRes.body.token}`)
            .set('x-resource-id', 'dataset-alpha');
        expect(reuseRes.status).toBe(401);
        await expect(sessionManager.elevateSession(approvalRes.body.sid, {
            extendSeconds: 60,
        })).rejects.toThrow('session_not_extendable');
        const auditLog = fs_1.default.readFileSync(auditLogPath, 'utf8');
        expect(auditLog).toMatch(/break_glass/);
        await teardown([opaServer, upstreamServer], stopObservability);
    });
    it('expires elevated tokens after the configured TTL', async () => {
        const { app, opaServer, upstreamServer, stopObservability, sessionManager, } = await bootstrap({ ttlSeconds: '1' });
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const baseToken = loginRes.body.token;
        const requestRes = await (0, supertest_1.default)(app)
            .post('/access/break-glass/request')
            .set('Authorization', `Bearer ${baseToken}`)
            .send({ justification: 'break glass', ticketId: 'INC-99' });
        const { session } = await sessionManager.validate(baseToken);
        const elevatedToken = await sessionManager.elevateSession(session.sid, {
            acr: 'loa2',
            amr: ['mfa'],
        });
        const approvalRes = await (0, supertest_1.default)(app)
            .post('/access/break-glass/approve')
            .set('Authorization', `Bearer ${elevatedToken}`)
            .send({ requestId: requestRes.body.requestId });
        await new Promise((resolve) => setTimeout(resolve, 1100));
        const expiredRes = await (0, supertest_1.default)(app)
            .get('/protected/data')
            .set('Authorization', `Bearer ${approvalRes.body.token}`)
            .set('x-resource-id', 'dataset-alpha');
        expect(expiredRes.status).toBe(401);
        expect(expiredRes.body.error).toBe('session_expired');
        const events = fs_1.default.readFileSync(breakGlassEventsPath, 'utf8');
        expect(events).toMatch(/expiry/);
        await teardown([opaServer, upstreamServer], stopObservability);
    });
    it('enforces ABAC/OPA decisions and emits audit trail during break-glass usage', async () => {
        const { app, opaServer, upstreamServer, stopObservability, sessionManager, } = await bootstrap({
            ttlSeconds: '10',
            opaDecision: { allow: false, reason: 'policy_denied' },
        });
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const baseToken = loginRes.body.token;
        const requestRes = await (0, supertest_1.default)(app)
            .post('/access/break-glass/request')
            .set('Authorization', `Bearer ${baseToken}`)
            .send({ justification: 'zero trust drill', ticketId: 'INC-77' });
        const { session } = await sessionManager.validate(baseToken);
        const elevatedToken = await sessionManager.elevateSession(session.sid, {
            acr: 'loa2',
            amr: ['mfa'],
        });
        const approvalRes = await (0, supertest_1.default)(app)
            .post('/access/break-glass/approve')
            .set('Authorization', `Bearer ${elevatedToken}`)
            .send({ requestId: requestRes.body.requestId });
        expect(approvalRes.status).toBe(200);
        const protectedRes = await (0, supertest_1.default)(app)
            .get('/protected/data')
            .set('Authorization', `Bearer ${approvalRes.body.token}`)
            .set('x-resource-id', 'dataset-alpha');
        expect(protectedRes.status).toBe(403);
        expect(protectedRes.body.reason).toBe('policy_denied');
        const events = fs_1.default
            .readFileSync(breakGlassEventsPath, 'utf8')
            .trim()
            .split('\n');
        expect(events.filter((line) => line.includes('"type":"request"')).length).toBe(1);
        expect(events.filter((line) => line.includes('"type":"approval"')).length).toBe(1);
        expect(events.filter((line) => line.includes('"type":"usage"')).length).toBe(1);
        const auditLog = fs_1.default.readFileSync(auditLogPath, 'utf8');
        expect(auditLog).toMatch(/policy_denied/);
        await teardown([opaServer, upstreamServer], stopObservability);
    });
    it('prevents re-approval once a break-glass grant expires', async () => {
        const { app, opaServer, upstreamServer, stopObservability, sessionManager, } = await bootstrap({ ttlSeconds: '2' });
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const baseToken = loginRes.body.token;
        const requestRes = await (0, supertest_1.default)(app)
            .post('/access/break-glass/request')
            .set('Authorization', `Bearer ${baseToken}`)
            .send({ justification: 'contain incident', ticketId: 'INC-401' });
        const { session } = await sessionManager.validate(baseToken);
        const elevatedToken = await sessionManager.elevateSession(session.sid, {
            acr: 'loa2',
            amr: ['mfa'],
        });
        const approvalRes = await (0, supertest_1.default)(app)
            .post('/access/break-glass/approve')
            .set('Authorization', `Bearer ${elevatedToken}`)
            .send({ requestId: requestRes.body.requestId });
        expect(approvalRes.status).toBe(200);
        const state = JSON.parse(fs_1.default.readFileSync(breakGlassStatePath, 'utf8'));
        const sid = state.requests[requestRes.body.requestId].sid;
        sessionManager.expire(sid);
        await expect(sessionManager.validate(approvalRes.body.token)).rejects.toThrow('session_expired');
        const secondApproval = await (0, supertest_1.default)(app)
            .post('/access/break-glass/approve')
            .set('Authorization', `Bearer ${elevatedToken}`)
            .send({ requestId: requestRes.body.requestId });
        expect(secondApproval.status).toBe(410);
        expect(secondApproval.body.error).toBe('request_expired');
        const events = fs_1.default.readFileSync(breakGlassEventsPath, 'utf8');
        expect(events).toMatch(/expiry/);
        await teardown([opaServer, upstreamServer], stopObservability);
    });
});
