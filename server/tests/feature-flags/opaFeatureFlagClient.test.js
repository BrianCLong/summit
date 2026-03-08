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
const globals_1 = require("@jest/globals");
const nock_1 = __importDefault(require("nock"));
const prom_client_1 = require("prom-client");
globals_1.jest.mock('../../src/feature-flags/metrics.js', () => ({
    __esModule: true,
    ensureMetricsRegistered: globals_1.jest.fn(),
    featureFlagLatency: {
        labels: () => ({ observe: () => { } }),
    },
    featureFlagDecisions: {
        labels: () => ({ inc: () => { } }),
    },
    killSwitchGauge: {
        labels: () => ({ set: () => { } }),
    },
}));
let OPAFeatureFlagClient;
const OPA_URL = 'http://localhost:8888';
(0, globals_1.describe)('OPAFeatureFlagClient', () => {
    let client;
    (0, globals_1.beforeAll)(() => {
        nock_1.default.disableNetConnect();
    });
    (0, globals_1.beforeEach)(async () => {
        process.env.OPA_URL = OPA_URL;
        process.env.FEATURE_FLAG_FAIL_OPEN = 'false';
        prom_client_1.register.clear();
        if (!OPAFeatureFlagClient) {
            ({ OPAFeatureFlagClient } = await Promise.resolve().then(() => __importStar(require('../../src/feature-flags/opaFeatureFlagClient.js'))));
        }
        client = new OPAFeatureFlagClient();
    });
    (0, globals_1.afterEach)(() => {
        nock_1.default.cleanAll();
    });
    (0, globals_1.afterAll)(() => {
        nock_1.default.enableNetConnect();
    });
    (0, globals_1.it)('returns OPA decision and audit metadata', async () => {
        (0, nock_1.default)(OPA_URL)
            .post('/v1/data/feature_flags/decision')
            .reply(200, {
            result: {
                enabled: true,
                reason: 'allowed',
                kill_switch_active: false,
                audit: { trace_id: 'trace-1' },
            },
        });
        const { decision } = await client.evaluateFlag('beta-mode', {
            userId: 'user-1',
            tenantId: 'tenant-1',
        });
        (0, globals_1.expect)(decision.enabled).toBe(true);
        (0, globals_1.expect)(decision.reason).toBe('allowed');
        (0, globals_1.expect)(decision.killSwitchActive).toBe(false);
        (0, globals_1.expect)(decision.audit?.trace_id).toBe('trace-1');
    });
    (0, globals_1.it)('evaluates module kill switches', async () => {
        (0, nock_1.default)(OPA_URL)
            .post('/v1/data/feature_flags/kill_switch')
            .reply(200, {
            result: {
                active: true,
                reason: 'ops-toggle',
                audit: { module: 'search' },
            },
        });
        const { decision } = await client.isKillSwitchActive('search', {
            module: 'search',
        });
        (0, globals_1.expect)(decision.active).toBe(true);
        (0, globals_1.expect)(decision.reason).toBe('ops-toggle');
        (0, globals_1.expect)(decision.audit?.module).toBe('search');
    });
    (0, globals_1.it)('fails closed when OPA is unavailable and failOpen is false', async () => {
        (0, nock_1.default)(OPA_URL)
            .post('/v1/data/feature_flags/decision')
            .replyWithError('opa-offline');
        process.env.FEATURE_FLAG_FAIL_OPEN = 'false';
        const strictClient = new OPAFeatureFlagClient();
        const { decision } = await strictClient.evaluateFlag('beta-mode');
        (0, globals_1.expect)(decision.enabled).toBe(false);
        (0, globals_1.expect)(decision.reason).toBe('opa-error');
    });
});
