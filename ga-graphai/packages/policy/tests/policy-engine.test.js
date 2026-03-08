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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_ts_1 = require("../src/index.ts");
(0, vitest_1.describe)('PolicyEngine', () => {
    const baseRules = [
        {
            id: 'allow-product',
            description: 'Allow product roles to read intents',
            effect: 'allow',
            actions: ['intent:read'],
            resources: ['intent'],
            conditions: [
                {
                    attribute: 'roles',
                    operator: 'includes',
                    value: ['product-manager', 'architect'],
                },
            ],
        },
        {
            id: 'deny-out-of-region',
            description: 'Block model access outside the permitted region',
            effect: 'deny',
            actions: ['model:invoke'],
            resources: ['llm'],
            conditions: [
                { attribute: 'region', operator: 'neq', value: 'us-east-1' },
            ],
        },
    ];
    (0, vitest_1.it)('grants access when the allow rule matches', () => {
        const engine = new index_ts_1.PolicyEngine(baseRules);
        const request = {
            action: 'intent:read',
            resource: 'intent',
            context: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['product-manager'],
                region: 'us-east-1',
            },
        };
        const result = engine.evaluate(request);
        (0, vitest_1.expect)(result.allowed).toBe(true);
        (0, vitest_1.expect)(result.matchedRules).toContain('allow-product');
        (0, vitest_1.expect)(result.effect).toBe('allow');
        (0, vitest_1.expect)(result.trace).toHaveLength(2);
    });
    (0, vitest_1.it)('denies access when a deny rule applies', () => {
        const engine = new index_ts_1.PolicyEngine(baseRules);
        const request = {
            action: 'model:invoke',
            resource: 'llm',
            context: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['ml-engineer'],
                region: 'eu-west-1',
            },
        };
        const result = engine.evaluate(request);
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.effect).toBe('deny');
        (0, vitest_1.expect)(result.reasons.some((reason) => reason.includes('Denied by deny-out-of-region'))).toBe(true);
    });
    (0, vitest_1.it)('captures condition failure reasons', () => {
        const engine = new index_ts_1.PolicyEngine(baseRules);
        const request = {
            action: 'intent:read',
            resource: 'intent',
            context: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['security-analyst'],
                region: 'us-east-1',
            },
        };
        const result = engine.evaluate(request);
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.reasons.some((reason) => reason.includes('condition roles includes'))).toBe(true);
    });
    (0, vitest_1.it)('default policy engine allows authorised workcell execution', () => {
        const engine = (0, index_ts_1.buildDefaultPolicyEngine)();
        const result = engine.evaluate({
            action: 'workcell:execute',
            resource: 'analysis',
            context: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['developer'],
                region: 'allowed-region',
            },
        });
        (0, vitest_1.expect)(result.allowed).toBe(true);
        (0, vitest_1.expect)(result.matchedRules).toContain('allow-workcell-execution');
    });
    (0, vitest_1.it)('default policy engine enforces regional guardrail for workcells', () => {
        const engine = (0, index_ts_1.buildDefaultPolicyEngine)();
        const result = engine.evaluate({
            action: 'workcell:execute',
            resource: 'analysis',
            context: {
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['developer'],
                region: 'eu-west-1',
            },
        });
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.effect).toBe('deny');
    });
});
if (process?.env?.NODE_TEST) {
    const { test: nodeTest } = await Promise.resolve().then(() => __importStar(require('node:test')));
    nodeTest('policy-engine vitest compatibility placeholder', () => { });
}
