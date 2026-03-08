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
const supertest_1 = __importDefault(require("supertest"));
describe('gateway edge-case handling', () => {
    afterEach(async () => {
        const config = await Promise.resolve().then(() => __importStar(require('../src/config')));
        config.setFeatureOverrides({ policyReasoner: true });
        jest.clearAllMocks();
        jest.resetModules();
    });
    it('rejects invalid login attempts', async () => {
        jest.resetModules();
        const { createApp } = await Promise.resolve().then(() => __importStar(require('../src/index')));
        const { stopObservability } = await Promise.resolve().then(() => __importStar(require('../src/observability')));
        const app = await createApp();
        const res = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'wrong-password' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('invalid_credentials');
        await stopObservability();
    });
    it('surfaces step-up signing errors', async () => {
        jest.resetModules();
        jest.doMock('../src/keys', () => {
            const actual = jest.requireActual('../src/keys');
            let shouldThrow = false;
            return {
                ...actual,
                async initKeys() {
                    await actual.initKeys();
                },
                getPrivateKey: jest.fn(() => {
                    if (shouldThrow) {
                        throw new Error('sign failure');
                    }
                    return actual.getPrivateKey();
                }),
                __setThrowOnGet(value) {
                    shouldThrow = value;
                },
            };
        });
        const { createApp } = await Promise.resolve().then(() => __importStar(require('../src/index')));
        const { stopObservability } = await Promise.resolve().then(() => __importStar(require('../src/observability')));
        const keys = await Promise.resolve().then(() => __importStar(require('../src/keys')));
        const app = await createApp();
        const login = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        keys.__setThrowOnGet?.(true);
        const stepUp = await (0, supertest_1.default)(app)
            .post('/auth/step-up')
            .set('Authorization', `Bearer ${login.body.token}`)
            .set('x-tenant-id', 'tenantA')
            .set('x-purpose', 'treatment')
            .set('x-authority', 'hipaa');
        expect(stepUp.status).toBe(500);
        expect(stepUp.body.error).toBe('step_up_failed');
        await stopObservability();
    });
    it('disables dry-run when the policy reasoner feature flag is off', async () => {
        jest.resetModules();
        const config = await Promise.resolve().then(() => __importStar(require('../src/config')));
        config.setFeatureOverrides({ policyReasoner: false });
        const { createApp } = await Promise.resolve().then(() => __importStar(require('../src/index')));
        const { stopObservability } = await Promise.resolve().then(() => __importStar(require('../src/observability')));
        const app = await createApp();
        const res = await (0, supertest_1.default)(app).post('/policy/dry-run').send({});
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('policy_reasoner_disabled');
        await stopObservability();
    });
    it('returns a bad request when dry-run evaluation fails', async () => {
        jest.resetModules();
        jest.doMock('../src/policy', () => {
            const actual = jest.requireActual('../src/policy');
            return {
                ...actual,
                dryRun: jest.fn().mockRejectedValue(new Error('dry-run failure')),
            };
        });
        const { createApp } = await Promise.resolve().then(() => __importStar(require('../src/index')));
        const { stopObservability } = await Promise.resolve().then(() => __importStar(require('../src/observability')));
        const app = await createApp();
        const res = await (0, supertest_1.default)(app)
            .post('/policy/dry-run')
            .send({ user: {}, resource: { path: '/protected/resource' } });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('invalid_dry_run_request');
        await stopObservability();
    });
    it('returns not found for unknown audit identifiers', async () => {
        jest.resetModules();
        const { createApp } = await Promise.resolve().then(() => __importStar(require('../src/index')));
        const { stopObservability } = await Promise.resolve().then(() => __importStar(require('../src/observability')));
        const app = await createApp();
        const res = await (0, supertest_1.default)(app).get('/audit/does-not-exist');
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('not_found');
        await stopObservability();
    });
});
describe('server bootstrap behavior', () => {
    const originalEnv = process.env.NODE_ENV;
    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        jest.clearAllMocks();
        jest.resetModules();
    });
    it('starts listening automatically outside the test environment', async () => {
        jest.resetModules();
        process.env.NODE_ENV = 'production';
        let listen;
        let expressMock;
        await new Promise((resolve, reject) => {
            let settled = false;
            listen = jest.fn((_port, cb) => {
                cb?.();
                if (!settled) {
                    settled = true;
                    resolve();
                }
                return undefined;
            });
            const appInstance = {
                use: jest.fn(),
                get: jest.fn(),
                post: jest.fn(),
                listen,
            };
            expressMock = Object.assign(jest.fn(() => appInstance), {
                json: jest.fn(() => (_req, _res, next) => {
                    next?.();
                }),
            });
            jest.doMock('express', () => expressMock);
            jest.doMock('http-proxy-middleware', () => ({
                createProxyMiddleware: jest.fn(() => (_req, _res, next) => {
                    next?.();
                }),
            }));
            jest.doMock('pino', () => jest.fn(() => ({ info: jest.fn() })));
            jest.doMock('pino-http', () => jest.fn(() => (_req, _res, next) => {
                next?.();
            }));
            jest.doMock('../src/keys', () => ({
                initKeys: jest.fn().mockResolvedValue(undefined),
                getPublicJwk: jest.fn(() => ({})),
                getPrivateKey: jest.fn(() => ({})),
            }));
            jest.doMock('../src/auth', () => ({
                login: jest.fn().mockResolvedValue('token'),
                introspect: jest.fn().mockResolvedValue({}),
            }));
            jest.doMock('../src/middleware', () => ({
                requireAuth: () => (_req, _res, next) => {
                    next?.();
                },
            }));
            jest.doMock('../src/observability', () => ({
                startObservability: jest.fn().mockResolvedValue(undefined),
                metricsHandler: jest.fn(),
            }));
            jest.doMock('../src/policy', () => ({
                dryRun: jest.fn().mockResolvedValue({
                    decision: {
                        allowed: true,
                        reason: 'ok',
                        policyId: 'policy.test',
                        policyVersion: '1',
                        appealLink: '#',
                        appealToken: 'token',
                        obligations: { redact: [], mask: {} },
                    },
                    fields: {},
                }),
            }));
            jest.doMock('../src/audit', () => ({
                getAuditEntry: jest.fn(() => null),
            }));
            jest.doMock('../src/config', () => ({
                features: { policyReasoner: true },
            }));
            jest.isolateModules(() => {
                Promise.resolve().then(() => __importStar(require('../src/index'))).catch((err) => {
                    if (!settled) {
                        settled = true;
                        reject(err);
                    }
                });
            });
        });
        expect(expressMock).toHaveBeenCalled();
        expect(listen).toHaveBeenCalled();
    });
});
