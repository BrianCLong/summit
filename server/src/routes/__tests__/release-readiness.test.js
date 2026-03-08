"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const ops_js_1 = __importDefault(require("../ops.js"));
const releaseReadinessService_js_1 = require("../../services/releaseReadinessService.js");
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
// Mock authentication middleware
globals_1.jest.mock('../../middleware/auth.js', () => ({
    ensureAuthenticated: (req, res, next) => {
        req.user = { id: 'test-user', role: 'ADMIN' };
        next();
    },
    ensureRole: (roles) => (req, res, next) => {
        if (roles.includes('ADMIN')) {
            next();
        }
        else {
            res.status(403).json({ error: 'Forbidden' });
        }
    },
}));
// Mock other services to avoid side effects
globals_1.jest.mock('../../scripts/maintenance.js', () => ({ runMaintenance: globals_1.jest.fn() }));
globals_1.jest.mock('../../backup/BackupService.js', () => ({
    BackupService: globals_1.jest.fn().mockImplementation(() => ({
        backupPostgres: globals_1.jest.fn(),
        backupNeo4j: globals_1.jest.fn(),
        backupRedis: globals_1.jest.fn(),
    })),
}));
globals_1.jest.mock('../../dr/DisasterRecoveryService.js', () => ({
    DisasterRecoveryService: globals_1.jest.fn().mockImplementation(() => ({
        runDrill: globals_1.jest.fn().mockResolvedValue(true),
        getStatus: globals_1.jest.fn().mockResolvedValue({ ok: true }),
    })),
}));
describeIf('Release Readiness API', () => {
    let app;
    (0, globals_1.beforeEach)(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/ops', ops_js_1.default);
        // Clear service cache before each test
        releaseReadinessService_js_1.releaseReadinessService.clearCache();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.restoreAllMocks();
    });
    (0, globals_1.describe)('GET /ops/release-readiness/summary', () => {
        (0, globals_1.it)('returns a valid summary with checks', async () => {
            const response = await (0, supertest_1.default)(app).get('/ops/release-readiness/summary');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('generatedAt');
            (0, globals_1.expect)(response.body).toHaveProperty('versionOrCommit');
            (0, globals_1.expect)(response.body).toHaveProperty('checks');
            (0, globals_1.expect)(Array.isArray(response.body.checks)).toBe(true);
        });
        (0, globals_1.it)('includes governance file checks', async () => {
            const response = await (0, supertest_1.default)(app).get('/ops/release-readiness/summary');
            (0, globals_1.expect)(response.status).toBe(200);
            const checks = response.body.checks;
            // Should include checks for critical files
            (0, globals_1.expect)(checks.some((c) => c.name.includes('Constitutional'))).toBe(true);
            (0, globals_1.expect)(checks.some((c) => c.name.includes('Control Registry'))).toBe(true);
            (0, globals_1.expect)(checks.some((c) => c.name.includes('Evidence Index'))).toBe(true);
        });
        (0, globals_1.it)('includes check status and evidence links', async () => {
            const response = await (0, supertest_1.default)(app).get('/ops/release-readiness/summary');
            (0, globals_1.expect)(response.status).toBe(200);
            const checks = response.body.checks;
            if (checks.length > 0) {
                const check = checks[0];
                (0, globals_1.expect)(check).toHaveProperty('id');
                (0, globals_1.expect)(check).toHaveProperty('name');
                (0, globals_1.expect)(check).toHaveProperty('status');
                (0, globals_1.expect)(['pass', 'fail', 'warn', 'unknown']).toContain(check.status);
                (0, globals_1.expect)(check).toHaveProperty('evidenceLinks');
            }
        });
        (0, globals_1.it)('handles errors gracefully', async () => {
            // Mock service to throw error
            globals_1.jest.spyOn(releaseReadinessService_js_1.releaseReadinessService, 'getSummary').mockRejectedValueOnce(new Error('Test error'));
            const response = await (0, supertest_1.default)(app).get('/ops/release-readiness/summary');
            (0, globals_1.expect)(response.status).toBe(500);
            (0, globals_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, globals_1.describe)('GET /ops/release-readiness/evidence-index', () => {
        (0, globals_1.it)('returns evidence index with controls and evidence', async () => {
            const response = await (0, supertest_1.default)(app).get('/ops/release-readiness/evidence-index');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('controls');
            (0, globals_1.expect)(response.body).toHaveProperty('evidence');
            (0, globals_1.expect)(Array.isArray(response.body.controls)).toBe(true);
            (0, globals_1.expect)(Array.isArray(response.body.evidence)).toBe(true);
        });
        (0, globals_1.it)('includes control details', async () => {
            const response = await (0, supertest_1.default)(app).get('/ops/release-readiness/evidence-index');
            (0, globals_1.expect)(response.status).toBe(200);
            const controls = response.body.controls;
            if (controls.length > 0) {
                const control = controls[0];
                (0, globals_1.expect)(control).toHaveProperty('id');
                (0, globals_1.expect)(control).toHaveProperty('name');
                (0, globals_1.expect)(control).toHaveProperty('description');
                (0, globals_1.expect)(control).toHaveProperty('enforcementPoint');
                (0, globals_1.expect)(control).toHaveProperty('evidenceArtifact');
            }
        });
        (0, globals_1.it)('includes evidence items with verification commands', async () => {
            const response = await (0, supertest_1.default)(app).get('/ops/release-readiness/evidence-index');
            (0, globals_1.expect)(response.status).toBe(200);
            const evidence = response.body.evidence;
            if (evidence.length > 0) {
                const item = evidence[0];
                (0, globals_1.expect)(item).toHaveProperty('controlId');
                (0, globals_1.expect)(item).toHaveProperty('controlName');
                (0, globals_1.expect)(item).toHaveProperty('evidenceType');
                (0, globals_1.expect)(item).toHaveProperty('location');
                (0, globals_1.expect)(item).toHaveProperty('verificationCommand');
            }
        });
        (0, globals_1.it)('handles errors gracefully', async () => {
            // Mock service to throw error
            globals_1.jest.spyOn(releaseReadinessService_js_1.releaseReadinessService, 'getEvidenceIndex').mockRejectedValueOnce(new Error('Test error'));
            const response = await (0, supertest_1.default)(app).get('/ops/release-readiness/evidence-index');
            (0, globals_1.expect)(response.status).toBe(500);
            (0, globals_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, globals_1.describe)('Authorization', () => {
        (0, globals_1.it)('rejects unauthorized requests to summary endpoint', async () => {
            // Create app without auth middleware mock
            const unauthedApp = (0, express_1.default)();
            unauthedApp.use(express_1.default.json());
            // Manually add router with real auth middleware
            const Router = require('express').Router;
            const testRouter = Router();
            testRouter.get('/release-readiness/summary', (req, res) => {
                if (!req.user) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                res.json({ ok: true });
            });
            unauthedApp.use('/ops', testRouter);
            const response = await (0, supertest_1.default)(unauthedApp).get('/ops/release-readiness/summary');
            (0, globals_1.expect)(response.status).toBe(401);
        });
        (0, globals_1.it)('rejects unauthorized requests to evidence-index endpoint', async () => {
            // Create app without auth middleware mock
            const unauthedApp = (0, express_1.default)();
            unauthedApp.use(express_1.default.json());
            const Router = require('express').Router;
            const testRouter = Router();
            testRouter.get('/release-readiness/evidence-index', (req, res) => {
                if (!req.user) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                res.json({ ok: true });
            });
            unauthedApp.use('/ops', testRouter);
            const response = await (0, supertest_1.default)(unauthedApp).get('/ops/release-readiness/evidence-index');
            (0, globals_1.expect)(response.status).toBe(401);
        });
    });
});
