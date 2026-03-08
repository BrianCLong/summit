"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = require("fs");
const index_1 = require("../src/index");
const observability_1 = require("../src/observability");
const session_1 = require("../src/session");
let opaServer;
let upstreamServer;
function signChallenge(challenge) {
    const privateKeyPath = path_1.default.join(__dirname, 'fixtures', 'webauthn-private.pem');
    const privateKey = (0, fs_1.readFileSync)(privateKeyPath, 'utf8');
    const signer = crypto_1.default.createSign('SHA256');
    signer.update(Buffer.from(challenge, 'utf8'));
    signer.end();
    return signer.sign(privateKey).toString('base64url');
}
async function performStepUp(app, token) {
    const challengeRes = await (0, supertest_1.default)(app)
        .post('/auth/webauthn/challenge')
        .set('Authorization', `Bearer ${token}`)
        .send({
        action: 'dataset:read',
        resourceId: 'dataset-alpha',
        classification: 'confidential',
    });
    const signature = signChallenge(challengeRes.body.challenge);
    const step = await (0, supertest_1.default)(app)
        .post('/auth/step-up')
        .set('Authorization', `Bearer ${token}`)
        .send({
        credentialId: challengeRes.body.allowCredentials[0].id,
        challenge: challengeRes.body.challenge,
        signature,
    });
    return step.body.token;
}
beforeAll((done) => {
    const upstream = (0, express_1.default)();
    upstream.get('/resource', (_req, res) => res.json({ data: 'ok' }));
    upstreamServer = upstream.listen(0, () => {
        const port = upstreamServer.address().port;
        process.env.UPSTREAM = `http://localhost:${port}`;
        const opa = (0, express_1.default)();
        opa.use(express_1.default.json());
        opa.post('/v1/data/summit/abac/decision', (req, res) => {
            const { subject, resource, context } = req.body.input;
            if (subject.tenantId !== resource.tenantId) {
                return res.json({
                    result: { allow: false, reason: 'tenant_mismatch', obligations: [] },
                });
            }
            if (subject.residency !== resource.residency) {
                return res.json({
                    result: {
                        allow: false,
                        reason: 'residency_mismatch',
                        obligations: [],
                    },
                });
            }
            if (resource.tags && resource.tags.includes('admin-only')) {
                return res.json({
                    result: {
                        allow: false,
                        reason: 'least_privilege_violation',
                        obligations: [],
                    },
                });
            }
            if (resource.classification !== 'public' &&
                context.currentAcr !== 'loa2') {
                return res.json({
                    result: {
                        allow: false,
                        reason: 'step_up_required',
                        obligations: [
                            { type: 'step_up', mechanism: 'webauthn', required_acr: 'loa2' },
                        ],
                    },
                });
            }
            return res.json({
                result: { allow: true, reason: 'allow', obligations: [] },
            });
        });
        opaServer = opa.listen(0, () => {
            const opaPort = opaServer.address().port;
            process.env.OPA_URL = `http://localhost:${opaPort}/v1/data/summit/abac/decision`;
            done();
        });
    });
});
afterAll(async () => {
    upstreamServer.close();
    opaServer.close();
    await (0, observability_1.stopObservability)();
});
describe('security', () => {
    it('rejects tampered token', async () => {
        const app = await (0, index_1.createApp)();
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const token = `${loginRes.body.token}tampered`;
        const res = await (0, supertest_1.default)(app)
            .get('/protected/resource')
            .set('Authorization', `Bearer ${token}`)
            .set('x-tenant-id', 'tenantA')
            .set('x-resource-id', 'dataset-alpha');
        expect(res.status).toBe(401);
    });
    it('rejects expired token', async () => {
        const app = await (0, index_1.createApp)();
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const sid = (await (0, supertest_1.default)(app)
            .post('/auth/introspect')
            .send({ token: loginRes.body.token })).body.sid;
        session_1.sessionManager.expire(String(sid));
        const token = loginRes.body.token;
        const res = await (0, supertest_1.default)(app)
            .get('/protected/resource')
            .set('Authorization', `Bearer ${token}`)
            .set('x-tenant-id', 'tenantA')
            .set('x-resource-id', 'dataset-alpha');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('session_expired');
    });
    it('enforces least privilege via policy deny', async () => {
        const app = await (0, index_1.createApp)();
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const token = loginRes.body.token;
        const elevatedToken = await performStepUp(app, token);
        const res = await (0, supertest_1.default)(app)
            .get('/protected/resource')
            .set('Authorization', `Bearer ${elevatedToken}`)
            .set('x-tenant-id', 'tenantA')
            .set('x-resource-residency', 'us')
            .set('x-resource-classification', 'public')
            .set('x-resource-tags', 'admin-only');
        expect(res.status).toBe(403);
    });
    it('rejects expired elevation windows', async () => {
        const app = await (0, index_1.createApp)();
        const sessionId = 'session-expired';
        const token = await new SignJWT({
            sub: 'alice',
            tenantId: 'tenantA',
            roles: ['reader'],
            acr: 'loa2',
            sid: sessionId,
            elevation: {
                sessionId,
                requestedAction: 'dataset:read',
                resourceId: 'dataset-alpha',
                tenantId: 'tenantA',
                classification: 'confidential',
                mechanism: 'webauthn',
                challengeId: 'expired',
                grantedAt: new Date(Date.now() - 10_000).toISOString(),
                expiresAt: new Date(Date.now() - 1_000).toISOString(),
            },
        })
            .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(getPrivateKey());
        const res = await (0, supertest_1.default)(app)
            .get('/protected/resource')
            .set('Authorization', `Bearer ${token}`)
            .set('x-tenant-id', 'tenantA')
            .set('x-resource-id', 'dataset-alpha');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('step_up_required');
    });
    it('binds elevated tokens to their source session', async () => {
        const app = await (0, index_1.createApp)();
        const token = await new SignJWT({
            sub: 'alice',
            tenantId: 'tenantA',
            roles: ['reader'],
            acr: 'loa2',
            sid: 'session-a',
            elevation: {
                sessionId: 'session-b',
                requestedAction: 'dataset:read',
                resourceId: 'dataset-alpha',
                tenantId: 'tenantA',
                classification: 'confidential',
                mechanism: 'webauthn',
                challengeId: 'mismatch',
                grantedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 10_000).toISOString(),
            },
        })
            .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(getPrivateKey());
        const res = await (0, supertest_1.default)(app)
            .get('/protected/resource')
            .set('Authorization', `Bearer ${token}`)
            .set('x-tenant-id', 'tenantA')
            .set('x-resource-id', 'dataset-alpha');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('step_up_required');
    });
});
