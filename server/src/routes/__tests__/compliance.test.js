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
const supertest_1 = __importDefault(require("supertest"));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../middleware/auth', () => ({
    ensureAuthenticated: (req, _res, next) => {
        if (req.headers['x-test-user-role']) {
            req.user = { role: req.headers['x-test-user-role'] };
        }
        next();
    },
    ensureRole: (roles) => (req, res, next) => {
        const user = req.user;
        if (user && roles.includes(user.role)) {
            next();
        }
        else {
            res.status(403).json({ error: 'Forbidden' });
        }
    },
    requirePermission: (permission) => (req, res, next) => {
        const user = req.user;
        if (user && (user.role === 'ADMIN' || user.role === 'ANALYST')) {
            next();
        }
        else {
            res.status(403).json({ error: 'Forbidden' });
        }
    },
    authMiddleware: (req, _res, next) => {
        if (req.headers['x-test-user-role']) {
            req.user = { role: req.headers['x-test-user-role'] };
        }
        next();
    },
    auth: (req, _res, next) => {
        if (req.headers['x-test-user-role']) {
            req.user = { role: req.headers['x-test-user-role'] };
        }
        next();
    },
}));
globals_1.jest.unstable_mockModule('../../provenance/ledger.js', () => ({
    ProvenanceLedgerV2: class {
        static getInstance() {
            return {
                appendEntry: globals_1.jest.fn().mockResolvedValue({}),
            };
        }
    },
    provenanceLedger: {
        appendEntry: globals_1.jest.fn().mockResolvedValue({}),
    },
}));
globals_1.jest.unstable_mockModule('../../middleware/audit-first.js', () => ({
    auditFirstMiddleware: (req, res, next) => next(),
}));
globals_1.jest.unstable_mockModule('../../compliance/frameworks/HIPAAControls.js', () => ({
    ALL_HIPAA_CONTROLS: [],
    HIPAA_FRAMEWORK: {},
    PHI_IDENTIFIERS: [],
    createHIPAAComplianceService: globals_1.jest.fn().mockReturnValue({
        getAssessmentHistory: globals_1.jest.fn().mockResolvedValue([]),
        getAssessment: globals_1.jest.fn().mockResolvedValue({}),
        performAssessment: globals_1.jest.fn().mockResolvedValue({ summary: {} }),
        recordEvidence: globals_1.jest.fn().mockResolvedValue({}),
    }),
}));
globals_1.jest.unstable_mockModule('../../compliance/frameworks/SOXControls.js', () => ({
    ALL_SOX_CONTROLS: [],
    SOX_FRAMEWORK: {},
    ITGC_DOMAINS: [],
    createSOXComplianceService: globals_1.jest.fn().mockReturnValue({
        getAssessmentHistory: globals_1.jest.fn().mockResolvedValue([]),
        getAssessment: globals_1.jest.fn().mockResolvedValue({}),
        performAssessment: globals_1.jest.fn().mockResolvedValue({ summary: {} }),
        generateSOC2Packet: globals_1.jest.fn().mockResolvedValue({
            auditPeriod: { start: '2025-01-01', end: '2025-12-31' },
            controls: { 'CC6.1': {}, 'CC7.1': {}, 'CC8.1': {} }
        }),
        recordEvidence: globals_1.jest.fn().mockResolvedValue({}),
    }),
}));
globals_1.jest.unstable_mockModule('../../middleware/rbac.js', () => ({
    requirePermission: (permission) => (req, res, next) => {
        const user = req.user;
        // Allow if admin or analyst (for testing purposes) or if no user check intended by this mock (it just passes through if user exists)
        // The previous mock logic for auth.ts requirePermission was:
        // if (user && (user.role === 'ADMIN' || user.role === 'ANALYST'))
        // Let's replicate strictness or looseness as needed. 
        // The tests set 'x-test-user-role'.
        // If no user, auth middleware usually handles it.
        if (user && (user.role === 'ADMIN' || user.role === 'ANALYST')) {
            next();
        }
        else {
            res.status(403).json({ error: 'Forbidden' });
        }
    },
    requireRole: (role) => (req, res, next) => {
        const user = req.user;
        if (user && user.role === role) {
            next();
        }
        else {
            res.status(403).json({ error: 'Forbidden' });
        }
    }
}));
// Dynamic imports AFTER mocks are set up
const { createApp } = await Promise.resolve().then(() => __importStar(require('../../app.js')));
let app;
const mockAdminUser = {
    user: {
        id: 'admin-user-id',
        role: 'ADMIN',
    },
};
const mockNonAdminUser = {
    user: {
        id: 'analyst-user-id',
        role: 'ANALYST',
    },
};
(0, globals_1.beforeAll)(async () => {
    app = await createApp();
});
describeIf('GET /api/compliance/soc2-packet', () => {
    const startDate = '2025-01-01T00:00:00.000Z';
    const endDate = '2025-12-31T23:59:59.999Z';
    (0, globals_1.it)('should return a 200 OK with a valid JSON SOC2 packet for an ADMIN user', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/compliance/soc2-packet')
            .set('x-test-user-role', 'ADMIN')
            .query({ startDate, endDate });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body).toHaveProperty('auditPeriod');
        (0, globals_1.expect)(response.body).toHaveProperty('controls');
        (0, globals_1.expect)(response.headers).toHaveProperty('x-evidence-signature');
        (0, globals_1.expect)(Object.keys(response.body.controls)).toEqual(globals_1.expect.arrayContaining(['CC6.1', 'CC7.1', 'CC8.1']));
    });
    (0, globals_1.it)('should return a 200 OK with a valid PDF SOC2 packet', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/compliance/soc2-packet')
            .set('x-test-user-role', 'ADMIN')
            .query({ startDate, endDate, format: 'pdf' });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.headers['content-type']).toBe('application/pdf');
        (0, globals_1.expect)(response.headers).toHaveProperty('x-evidence-signature');
    });
    (0, globals_1.it)('should return a 403 Forbidden for a non-admin user', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/compliance/soc2-packet')
            .set('x-test-user-role', 'ANALYST')
            .query({ startDate, endDate });
        (0, globals_1.expect)(response.status).toBe(403);
    });
    (0, globals_1.it)('should return a 400 Bad Request if startDate is missing', async () => {
        const endDate = '2025-12-31T23:59:59.999Z';
        const response = await (0, supertest_1.default)(app)
            .get('/api/compliance/soc2-packet')
            .query({ endDate });
        (0, globals_1.expect)(response.status).toBe(400);
        (0, globals_1.expect)(response.body.error).toBe('startDate and endDate query parameters are required.');
    });
    (0, globals_1.it)('should return a 400 Bad Request if endDate is missing', async () => {
        const startDate = '2025-01-01T00:00:00.000Z';
        const response = await (0, supertest_1.default)(app)
            .get('/api/compliance/soc2-packet')
            .query({ startDate });
        (0, globals_1.expect)(response.status).toBe(400);
        (0, globals_1.expect)(response.body.error).toBe('startDate and endDate query parameters are required.');
    });
    (0, globals_1.it)('should return a 400 Bad Request for invalid date formats', async () => {
        const startDate = 'not-a-date';
        const endDate = '2025-12-31';
        const response = await (0, supertest_1.default)(app)
            .get('/api/compliance/soc2-packet')
            .query({ startDate, endDate });
        (0, globals_1.expect)(response.status).toBe(400);
        (0, globals_1.expect)(response.body.error).toBe('Invalid date format. Please use ISO 8061 format.');
    });
    // Note: A test for the authorization middleware would go here.
    // Since I cannot implement the actual auth, this is a placeholder.
    globals_1.it.todo('should return a 403 Forbidden if the user is not a compliance-officer');
});
