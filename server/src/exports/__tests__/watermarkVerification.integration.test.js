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
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const originalEnv = process.env;
(0, globals_1.describe)('POST /exports/:id/verify-watermark', () => {
    let app;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.resetModules();
        process.env = { ...originalEnv, WATERMARK_VERIFY: 'true' };
        const exportsRouter = (await Promise.resolve().then(() => __importStar(require('../../routes/exports.js')))).default;
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api', exportsRouter);
    });
    (0, globals_1.afterAll)(() => {
        process.env = originalEnv;
    });
    (0, globals_1.it)('returns a valid result for a matching watermark', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/api/exports/export-123/verify-watermark')
            .send({ artifactId: 'valid-artifact' });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.valid).toBe(true);
        (0, globals_1.expect)(response.body.mismatches).toEqual([]);
        (0, globals_1.expect)(response.body.manifestHash).toContain('abcd1234');
        (0, globals_1.expect)(response.body.observedWatermark.exportId).toBe('export-123');
    });
    (0, globals_1.it)('flags mismatches for tampered artifacts', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/api/exports/export-123/verify-watermark')
            .send({ artifactId: 'tampered-artifact' });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.valid).toBe(false);
        (0, globals_1.expect)(response.body.mismatches).toEqual(globals_1.expect.arrayContaining([
            'manifest-hash-mismatch',
            'audit-ledger-manifest-mismatch',
            'policy-hash-mismatch',
        ]));
        (0, globals_1.expect)(response.body.reasonCodes).toEqual(globals_1.expect.arrayContaining([
            'manifest-hash-mismatch',
            'audit-ledger-manifest-mismatch',
            'policy-hash-mismatch',
        ]));
        (0, globals_1.expect)(response.body.observedWatermark.policyHash).toBe('policy-tampered');
    });
});
