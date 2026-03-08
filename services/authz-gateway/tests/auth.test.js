"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const crypto_1 = __importDefault(require("crypto"));
const index_1 = require("../src/index");
const observability_1 = require("../src/observability");
const jose_1 = require("jose");
const oidc_1 = require("../src/oidc");
function signChallenge(challenge) {
    const privateKeyPath = path_1.default.join(__dirname, 'fixtures', 'webauthn-private.pem');
    const privateKey = (0, fs_1.readFileSync)(privateKeyPath, 'utf8');
    const signer = crypto_1.default.createSign('SHA256');
    signer.update(Buffer.from(challenge, 'utf8'));
    signer.end();
    return signer.sign(privateKey).toString('base64url');
}
async function buildOidcToken(claims = {}, { requireMfa = true } = {}) {
    const { publicKey, privateKey } = await (0, jose_1.generateKeyPair)('RS256');
    const jwk = await (0, jose_1.exportJWK)(publicKey);
    jwk.kid = 'test-oidc-kid';
    jwk.use = 'sig';
    jwk.alg = 'RS256';
    const issuer = 'https://oidc.example.test';
    const audience = 'authz-gateway';
    const oidc = (0, express_1.default)();
    oidc.get('/.well-known/jwks.json', (_req, res) => res.json({ keys: [jwk] }));
    const server = oidc.listen(0);
    const jwksPort = server.address().port;
    process.env.OIDC_JWKS_URI = `http://localhost:${jwksPort}/.well-known/jwks.json`;
    process.env.OIDC_ISSUER = issuer;
    process.env.OIDC_AUDIENCE = audience;
    process.env.STAGING_REQUIRE_MFA = requireMfa ? 'true' : 'false';
    const idToken = await new jose_1.SignJWT({
        sub: 'alice',
        acr: 'loa2',
        amr: ['pwd', 'mfa'],
        ...claims,
    })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-oidc-kid' })
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey);
    return { server, idToken };
}
describe('token lifecycle', () => {
    beforeAll(() => {
        process.env.AUTHZ_DEMO_USERNAME = 'alice';
        process.env.AUTHZ_DEMO_PASSWORD = 'password123';
    });
    afterAll(async () => {
        delete process.env.AUTHZ_DEMO_USERNAME;
        delete process.env.AUTHZ_DEMO_PASSWORD;
        await (0, observability_1.stopObservability)();
    });
    afterEach(() => {
        delete process.env.OIDC_JWKS_URI;
        delete process.env.OIDC_ISSUER;
        delete process.env.OIDC_AUDIENCE;
        delete process.env.STAGING_REQUIRE_MFA;
        (0, oidc_1.resetOidcCache)();
    });
    it('logs in and introspects', async () => {
        process.env.OPA_URL = 'http://localhost:8181/v1/data/summit/abac/decision';
        const app = await (0, index_1.createApp)();
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        expect(loginRes.status).toBe(200);
        const token = loginRes.body.token;
        const introspectRes = await (0, supertest_1.default)(app)
            .post('/auth/introspect')
            .send({ token });
        expect(introspectRes.status).toBe(200);
        expect(introspectRes.body.sub).toBe('alice');
    });
    it('exchanges an OIDC id_token with JWKS validation', async () => {
        const { server, idToken } = await buildOidcToken();
        const app = await (0, index_1.createApp)();
        const res = await (0, supertest_1.default)(app)
            .post('/auth/oidc/callback')
            .send({ idToken });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        const introspectRes = await (0, supertest_1.default)(app)
            .post('/auth/introspect')
            .send({ token: res.body.token });
        expect(introspectRes.status).toBe(200);
        expect(introspectRes.body.amr).toContain('mfa');
        server.close();
    });
    it('rejects OIDC tokens that do not meet MFA in staging', async () => {
        const { server, idToken } = await buildOidcToken({ acr: 'loa1', amr: ['pwd'] }, { requireMfa: true });
        const app = await (0, index_1.createApp)();
        const res = await (0, supertest_1.default)(app)
            .post('/auth/oidc/callback')
            .send({ idToken });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('mfa_required');
        server.close();
    });
    it('serves JWKS', async () => {
        const app = await (0, index_1.createApp)();
        const res = await (0, supertest_1.default)(app).get('/.well-known/jwks.json');
        expect(res.status).toBe(200);
        expect(res.body.keys[0].kty).toBe('RSA');
    });
    it('rejects invalid introspection token', async () => {
        const app = await (0, index_1.createApp)();
        const res = await (0, supertest_1.default)(app)
            .post('/auth/introspect')
            .send({ token: 'bad' });
        expect(res.status).toBe(401);
    });
    it('performs WebAuthn step-up authentication', async () => {
        const opa = (0, express_1.default)();
        opa.use(express_1.default.json());
        opa.post('/v1/data/summit/abac/decision', (_req, res) => res.json({ result: { allow: true, reason: 'allow', obligations: [] } }));
        const opaServer = opa.listen(0);
        const opaPort = opaServer.address().port;
        process.env.OPA_URL = `http://localhost:${opaPort}/v1/data/summit/abac/decision`;
        const app = await (0, index_1.createApp)();
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        expect(loginRes.status).toBe(200);
        const token = loginRes.body.token;
        const challengeRes = await (0, supertest_1.default)(app)
            .post('/auth/webauthn/challenge')
            .set('Authorization', `Bearer ${token}`)
            .send({
            action: 'dataset:read',
            resourceId: 'dataset-alpha',
            classification: 'confidential',
        });
        expect(challengeRes.status).toBe(200);
        expect(challengeRes.body.challenge).toBeDefined();
        const signature = signChallenge(challengeRes.body.challenge);
        const step = await (0, supertest_1.default)(app)
            .post('/auth/step-up')
            .set('Authorization', `Bearer ${token}`)
            .send({
            credentialId: challengeRes.body.allowCredentials[0].id,
            challenge: challengeRes.body.challenge,
            signature,
        });
        expect(step.status).toBe(200);
        const introspectRes = await (0, supertest_1.default)(app)
            .post('/auth/introspect')
            .send({ token: step.body.token });
        expect(introspectRes.status).toBe(200);
        expect(introspectRes.body.acr).toBe('loa2');
        expect(introspectRes.body.elevation.requestedAction).toBe('dataset:read');
        opaServer.close();
    });
});
