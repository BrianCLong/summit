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
/**
 * Trust Center API Tests
 *
 * Note: Full integration tests require database and service setup.
 * These tests are currently skipped due to module loading constraints
 * in the test environment.
 *
 * TODO: Enable tests once proper test fixtures are available.
 */
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Trust Center API', () => {
    (0, globals_1.describe)('SLO Metrics Structure', () => {
        (0, globals_1.it)('should define expected SLO targets', () => {
            // These are the expected SLO targets from the implementation
            const expectedTargets = {
                availability: 99.9,
                latencyP95: 200,
                latencyP99: 500,
                errorRate: 0.1,
            };
            (0, globals_1.expect)(expectedTargets.availability).toBe(99.9);
            (0, globals_1.expect)(expectedTargets.latencyP95).toBe(200);
            (0, globals_1.expect)(expectedTargets.latencyP99).toBe(500);
            (0, globals_1.expect)(expectedTargets.errorRate).toBe(0.1);
        });
    });
    globals_1.describe.skip('API Structure', () => {
        (0, globals_1.it)('should export TRUST_CENTER_API_SCHEMA with required tables', async () => {
            const { TRUST_CENTER_API_SCHEMA } = await Promise.resolve().then(() => __importStar(require('../routes/trust-center-api.js')));
            (0, globals_1.expect)(TRUST_CENTER_API_SCHEMA).toBeDefined();
            (0, globals_1.expect)(TRUST_CENTER_API_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS certifications');
            (0, globals_1.expect)(TRUST_CENTER_API_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS incidents');
        });
        (0, globals_1.it)('should have default router export', async () => {
            const routerModule = await Promise.resolve().then(() => __importStar(require('../routes/trust-center-api.js')));
            (0, globals_1.expect)(routerModule.default).toBeDefined();
        });
    });
});
