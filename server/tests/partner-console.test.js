"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const PolicyProfileService_js_1 = require("../src/services/PolicyProfileService.js");
const policy_profiles_js_1 = __importDefault(require("../src/routes/policy-profiles.js"));
const tenants_js_1 = __importDefault(require("../src/routes/tenants.js"));
// Mock dependencies
globals_1.jest.mock('../src/services/TenantService.js', () => ({
    tenantService: {
        getTenant: globals_1.jest.fn(),
        updateSettings: globals_1.jest.fn(),
        disableTenant: globals_1.jest.fn(),
        getTenantSettings: globals_1.jest.fn()
    },
    createTenantSchema: { parse: globals_1.jest.fn() },
    createTenantBaseSchema: {
        extend: globals_1.jest.fn().mockReturnValue({ parse: globals_1.jest.fn((body) => body) }),
    },
}));
globals_1.jest.mock('../src/services/PolicyProfileService.js', () => {
    const originalModule = globals_1.jest.requireActual('../src/services/PolicyProfileService.js');
    return {
        ...originalModule,
        policyProfileService: {
            getProfiles: globals_1.jest.fn(),
            getProfile: globals_1.jest.fn(),
            applyProfile: globals_1.jest.fn(),
        },
    };
});
globals_1.jest.mock('../src/middleware/auth.js', () => ({
    ensureAuthenticated: (req, _res, next) => {
        req.user = { id: 'test-user', role: 'ADMIN', tenantId: 'test-tenant' };
        next();
    },
}));
globals_1.jest.mock('../src/middleware/abac.js', () => ({
    ensurePolicy: () => (req, _res, next) => next(),
}));
globals_1.jest.mock('../src/repos/ProvenanceRepo.js');
globals_1.jest.mock('../src/config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn()
}));
globals_1.jest.mock('crypto', () => ({
    ...globals_1.jest.requireActual('crypto'),
    randomUUID: () => 'test-uuid',
    createHash: () => ({ update: () => ({ digest: () => 'hash' }) })
}));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use('/api/tenants', tenants_js_1.default);
app.use('/api/policy-profiles', policy_profiles_js_1.default);
const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? globals_1.describe : globals_1.describe.skip;
describeIf('Partner Console Integration', () => {
    (0, globals_1.describe)('GET /api/policy-profiles', () => {
        (0, globals_1.it)('should return a list of profiles', async () => {
            const mockProfiles = [{ id: 'baseline', name: 'Baseline' }];
            PolicyProfileService_js_1.PolicyProfileService.getInstance().getProfiles.mockReturnValue(mockProfiles);
            PolicyProfileService_js_1.PolicyProfileService.getInstance().getProfiles = globals_1.jest.fn().mockReturnValue(mockProfiles);
            // Re-mock the imported instance
            PolicyProfileService_js_1.policyProfileService.getProfiles.mockReturnValue(mockProfiles);
            const res = await (0, supertest_1.default)(app).get('/api/policy-profiles');
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body.success).toBe(true);
            (0, globals_1.expect)(res.body.data).toEqual(mockProfiles);
        });
    });
    (0, globals_1.describe)('POST /api/tenants/:id/policy-profile', () => {
        (0, globals_1.it)('should apply a policy profile', async () => {
            const tenantId = 'test-tenant';
            const profileId = 'strict';
            PolicyProfileService_js_1.policyProfileService.applyProfile.mockImplementation(async () => undefined);
            const res = await (0, supertest_1.default)(app)
                .post(`/api/tenants/${tenantId}/policy-profile`)
                .send({ profileId });
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body.success).toBe(true);
            (0, globals_1.expect)(res.body.receipt).toBeDefined();
            (0, globals_1.expect)(PolicyProfileService_js_1.policyProfileService.applyProfile).toHaveBeenCalledWith(tenantId, profileId, 'test-user');
        });
        (0, globals_1.it)('should return 404 if tenant not found', async () => {
            PolicyProfileService_js_1.policyProfileService.applyProfile.mockImplementation(async () => {
                throw new Error('Tenant not found');
            });
            const res = await (0, supertest_1.default)(app)
                .post(`/api/tenants/missing/policy-profile`)
                .send({ profileId: 'strict' });
            (0, globals_1.expect)(res.status).toBe(404);
        });
    });
});
