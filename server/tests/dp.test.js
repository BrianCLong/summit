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
const globals_1 = require("@jest/globals");
// Mock ioredis
globals_1.jest.mock('ioredis', () => ({
    Redis: class RedisMock {
        store = new Map();
        get(key) {
            return Promise.resolve(this.store.get(key));
        }
        incrbyfloat(key, val) {
            const curr = this.store.get(key) || 0;
            this.store.set(key, curr + val);
            return Promise.resolve(curr + val);
        }
        expire() { }
        eval(_script, _numKeys, key, cost, limit) {
            const current = this.store.get(key) || 0;
            const c = parseFloat(cost);
            const l = parseFloat(limit);
            if (current + c > l) {
                return Promise.resolve(0);
            }
            this.store.set(key, current + c);
            return Promise.resolve(1);
        }
    },
}));
let LaplaceMechanism;
let PrivacyBudgetLedger;
(0, globals_1.beforeAll)(async () => {
    const mod = await Promise.resolve().then(() => __importStar(require('../src/services/dp-runtime/mechanisms.js')));
    LaplaceMechanism = mod.LaplaceMechanism;
    PrivacyBudgetLedger = mod.PrivacyBudgetLedger;
});
(0, globals_1.describe)('Differential Privacy Mechanisms', () => {
    (0, globals_1.test)('Laplace Mechanism adds noise', () => {
        const mech = new LaplaceMechanism();
        const val = 100;
        const sensitivity = 1;
        const epsilon = 0.1;
        const noisy1 = mech.addNoise(val, sensitivity, epsilon);
        const noisy2 = mech.addNoise(val, sensitivity, epsilon);
        (0, globals_1.expect)(noisy1).not.toBe(val);
        (0, globals_1.expect)(noisy1).not.toBe(noisy2);
    });
});
const RUN_LEDGER = process.env.ZERO_FOOTPRINT !== 'true';
const describeIf = RUN_LEDGER ? globals_1.describe : globals_1.describe.skip;
describeIf('Privacy Budget Ledger', () => {
    let ledger;
    (0, globals_1.beforeEach)(() => {
        ledger = new PrivacyBudgetLedger();
    });
    (0, globals_1.test)('consumeBudgetIfAvailable returns true when budget available', async () => {
        const allowed = await ledger.consumeBudgetIfAvailable('user_test_1', 1.0);
        (0, globals_1.expect)(allowed).toBe(true);
    });
    (0, globals_1.test)('consumeBudgetIfAvailable updates usage', async () => {
        await ledger.consumeBudgetIfAvailable('user_test_2', 5.0);
        const remaining = await ledger.getRemainingBudget('user_test_2');
        (0, globals_1.expect)(remaining).toBe(5.0);
    });
    (0, globals_1.test)('consumeBudgetIfAvailable returns false when exhausted', async () => {
        await ledger.consumeBudgetIfAvailable('user_test_3', 9.5);
        const allowed = await ledger.consumeBudgetIfAvailable('user_test_3', 1.0);
        (0, globals_1.expect)(allowed).toBe(false);
    });
});
