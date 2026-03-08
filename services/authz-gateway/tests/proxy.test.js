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
let upstreamServer;
let opaServer;
function signChallenge(challenge) {
    const privateKeyPath = path_1.default.join(__dirname, 'fixtures', 'webauthn-private.pem');
    const privateKey = (0, fs_1.readFileSync)(privateKeyPath, 'utf8');
    const signer = crypto_1.default.createSign('SHA256');
    signer.update(Buffer.from(challenge, 'utf8'));
    signer.end();
    return signer.sign(privateKey).toString('base64url');
}
async function stepUp(app, token) {
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
    process.env.AUTHZ_DEMO_USERNAME = 'alice';
    process.env.AUTHZ_DEMO_PASSWORD = 'password123';
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
            const requiresStepUp = resource.classification !== 'public';
            if (requiresStepUp && context.currentAcr !== 'loa2') {
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
    delete process.env.AUTHZ_DEMO_USERNAME;
    delete process.env.AUTHZ_DEMO_PASSWORD;
    upstreamServer.close();
    opaServer.close();
    await (0, observability_1.stopObservability)();
});
describe('proxy', () => {
    it('requires step-up before granting access and succeeds after upgrade', async () => {
        const app = await (0, index_1.createApp)();
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const token = loginRes.body.token;
        const first = await (0, supertest_1.default)(app)
            .get('/protected/resource')
            .set('Authorization', `Bearer ${token}`)
            .set('x-tenant-id', 'tenantA')
            .set('x-resource-id', 'dataset-alpha');
        expect(first.status).toBe(401);
        expect(first.body.error).toBe('step_up_required');
        expect(first.body.obligations[0].required_acr).toBe('loa2');
        const elevatedToken = await stepUp(app, token);
        const second = await (0, supertest_1.default)(app)
            .get('/protected/resource')
            .set('Authorization', `Bearer ${elevatedToken}`)
            .set('x-tenant-id', 'tenantA')
            .set('x-resource-id', 'dataset-alpha');
        expect(second.status).toBe(200);
        expect(second.body.data).toBe('ok');
    });
    it('blocks cross-tenant access even after step-up', async () => {
        const app = await (0, index_1.createApp)();
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const token = loginRes.body.token;
        const elevatedToken = await stepUp(app, token);
        const res = await (0, supertest_1.default)(app)
            .get('/protected/resource')
            .set('Authorization', `Bearer ${elevatedToken}`)
            .set('x-tenant-id', 'tenantB')
            .set('x-resource-id', 'dataset-beta');
        expect(res.status).toBe(403);
    });
});
