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
const mockGenerateBundle = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../middleware/auth.js', () => ({
    ensureAuthenticated: (req, _res, next) => {
        req.user = {
            id: 'user-123',
            role: 'ADMIN',
            tenantId: 'tenant-123',
        };
        next();
    },
}));
globals_1.jest.unstable_mockModule('../../lib/featureFlags.js', () => ({
    isEnabled: () => true,
}));
globals_1.jest.unstable_mockModule('../../services/support/index.js', () => ({
    supportBundleService: {
        generateBundle: mockGenerateBundle,
    },
}));
const supportBundlesRouter = (await Promise.resolve().then(() => __importStar(require('../support-bundles.js')))).default;
const buildApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api', supportBundlesRouter);
    return app;
};
(0, globals_1.describe)('support bundles router', () => {
    (0, globals_1.it)('generates a support bundle with manifest and redacted payload', async () => {
        mockGenerateBundle.mockResolvedValue({
            manifest: { bundleId: 'support-bundle-1' },
            signatureType: 'none',
            manifestSignature: 'none:signature',
            bundle: { bundleId: 'support-bundle-1' },
            receipt: { id: 'receipt-1' },
            policyDecision: { policyDecisionId: 'policy-1' },
            redaction: { policyId: 'support-bundle-redaction-v1' },
        });
        const app = buildApp();
        const res = await (0, supertest_1.default)(app).post('/api/support-bundles:generate').send({
            tenantId: 'tenant-123',
            reason: 'Need diagnostics for pilot support.',
            receiptsLimit: 5,
        });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.manifest.bundleId).toBe('support-bundle-1');
        (0, globals_1.expect)(res.body.receipt.id).toBe('receipt-1');
        (0, globals_1.expect)(mockGenerateBundle).toHaveBeenCalledWith({
            actor: {
                id: 'user-123',
                role: 'ADMIN',
                tenantId: 'tenant-123',
                email: undefined,
            },
            tenantId: 'tenant-123',
            reason: 'Need diagnostics for pilot support.',
            receiptsLimit: 5,
            sloRunbook: undefined,
            sloWindow: undefined,
        });
    });
});
