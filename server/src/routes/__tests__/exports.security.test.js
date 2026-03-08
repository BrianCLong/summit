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
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
(0, node_test_1.describe)('Exports Security', () => {
    let app;
    (0, node_test_1.before)(async () => {
        console.log('Mock object keys:', Object.keys(node_test_1.mock));
        // Fallback or debug
        if (!node_test_1.mock.module) {
            throw new Error('mock.module is missing');
        }
        // Mock dependencies to avoid DB connections and side effects
        node_test_1.mock.module('../analytics/exports/ExportController.js', {
            namedExports: {
                exportData: (req, res) => res.send('mocked'),
            },
        });
        node_test_1.mock.module('../../exports/WatermarkVerificationService.js', {
            namedExports: {
                WatermarkVerificationService: class {
                    verify() { return Promise.resolve({ valid: true }); }
                },
            },
        });
        node_test_1.mock.module('../../middleware/auth.js', {
            namedExports: {
                ensureAuthenticated: (req, res, next) => next(),
            },
        });
        node_test_1.mock.module('../../middleware/sensitive-context.js', {
            namedExports: {
                sensitiveContextMiddleware: (req, res, next) => next(),
            },
        });
        node_test_1.mock.module('../../middleware/high-risk-approval.js', {
            namedExports: {
                highRiskApprovalMiddleware: (req, res, next) => next(),
            },
        });
        // Import the router after mocking
        const exportsModule = await Promise.resolve().then(() => __importStar(require('../exports.js')));
        const exportsRouter = exportsModule.default;
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/', exportsRouter);
        // Enable verification for tests
        process.env.WATERMARK_VERIFY = 'true';
    });
    (0, node_test_1.it)('should reject path traversal in artifactId', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/exports/123/verify-watermark')
            .send({ artifactId: '../etc/passwd' });
        node_assert_1.default.strictEqual(res.status, 400);
        node_assert_1.default.strictEqual(res.body.error, 'Invalid artifactId');
    });
    (0, node_test_1.it)('should reject absolute path in artifactId', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/exports/123/verify-watermark')
            .send({ artifactId: '/etc/passwd' });
        node_assert_1.default.strictEqual(res.status, 400);
        node_assert_1.default.strictEqual(res.body.error, 'Invalid artifactId');
    });
    (0, node_test_1.it)('should reject complex path in artifactId', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/exports/123/verify-watermark')
            .send({ artifactId: 'a/b.txt' });
        node_assert_1.default.strictEqual(res.status, 400);
        node_assert_1.default.strictEqual(res.body.error, 'Invalid artifactId');
    });
});
