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
const express_1 = __importDefault(require("express"));
// Mock functions declared before mocks
const mockCreateApiKey = globals_1.jest.fn();
const mockListApiKeys = globals_1.jest.fn();
const mockValidateApiKey = globals_1.jest.fn();
const mockRegisterPartner = globals_1.jest.fn();
const mockShareCase = globals_1.jest.fn();
const mockLoggerInfo = globals_1.jest.fn();
const mockLoggerError = globals_1.jest.fn();
const mockLoggerWarn = globals_1.jest.fn();
const mockMetricsIncrement = globals_1.jest.fn();
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../services/ApiKeyService.js', () => ({
    apiKeyService: {
        createApiKey: mockCreateApiKey,
        listApiKeys: mockListApiKeys,
        validateApiKey: mockValidateApiKey,
    },
}));
globals_1.jest.unstable_mockModule('../../services/PartnerService.js', () => ({
    partnerService: {
        registerPartner: mockRegisterPartner,
        shareCase: mockShareCase,
    },
}));
globals_1.jest.unstable_mockModule('../../observability/index.js', () => ({
    logger: {
        info: mockLoggerInfo,
        error: mockLoggerError,
        warn: mockLoggerWarn,
    },
    metrics: {
        increment: mockMetricsIncrement,
    },
}));
globals_1.jest.unstable_mockModule('../../db/pg.js', () => ({
    pg: {
        oneOrNone: globals_1.jest.fn(),
        manyOrNone: globals_1.jest.fn(),
        one: globals_1.jest.fn(),
        none: globals_1.jest.fn(),
    },
}));
// Dynamic imports AFTER mocks are set up
const partnerRouter = (await Promise.resolve().then(() => __importStar(require('../partners.js')))).default;
const { apiKeyService } = await Promise.resolve().then(() => __importStar(require('../../services/ApiKeyService.js')));
const { partnerService } = await Promise.resolve().then(() => __importStar(require('../../services/PartnerService.js')));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Mock auth middleware
app.use((req, res, next) => {
    req.user = { id: 'test-user', tenantId: 'test-tenant' };
    next();
});
app.use('/api/partners', partnerRouter);
describeIf('Partner Routes', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('POST /api/partners/onboard', () => {
        (0, globals_1.it)('should onboard a new partner successfully', async () => {
            const mockInput = {
                name: 'Test Agency',
                slug: 'test-agency',
                region: 'US',
                contactEmail: 'contact@agency.com',
                partnerType: 'agency'
            };
            const mockResult = {
                id: 'new-tenant-id',
                name: 'Test Agency',
                status: 'pending_approval'
            };
            mockRegisterPartner.mockResolvedValue(mockResult);
            const res = await (0, supertest_1.default)(app)
                .post('/api/partners/onboard')
                .send(mockInput);
            (0, globals_1.expect)(res.status).toBe(201);
            (0, globals_1.expect)(res.body).toEqual(mockResult);
            (0, globals_1.expect)(partnerService.registerPartner).toHaveBeenCalledWith(mockInput, 'test-user');
        });
        (0, globals_1.it)('should validate input', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/partners/onboard')
                .send({ name: 'Short' }); // Missing required fields
            (0, globals_1.expect)(res.status).toBe(400);
        });
    });
    (0, globals_1.describe)('POST /api/partners/keys', () => {
        (0, globals_1.it)('should create an API key', async () => {
            const mockResult = {
                apiKey: { id: 'key-id', prefix: 'sk_live_...' },
                token: 'sk_live_12345'
            };
            mockCreateApiKey.mockResolvedValue(mockResult);
            const res = await (0, supertest_1.default)(app)
                .post('/api/partners/keys')
                .send({ name: 'Test Key', scopes: ['read:cases'] });
            (0, globals_1.expect)(res.status).toBe(201);
            (0, globals_1.expect)(res.body).toEqual(mockResult);
            (0, globals_1.expect)(apiKeyService.createApiKey).toHaveBeenCalledWith({
                tenantId: 'test-tenant',
                name: 'Test Key',
                scopes: ['read:cases'],
                createdBy: 'test-user'
            });
        });
    });
    (0, globals_1.describe)('GET /api/partners/keys', () => {
        (0, globals_1.it)('should list API keys', async () => {
            const mockKeys = [{ id: 'key-1' }, { id: 'key-2' }];
            mockListApiKeys.mockResolvedValue(mockKeys);
            const res = await (0, supertest_1.default)(app).get('/api/partners/keys');
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body).toEqual(mockKeys);
        });
    });
    // Note: Testing /api/partners/exchange/cases requires headers modification which supertest handles,
    // but our route uses a custom middleware `requireApiKey`.
    // We need to mock `apiKeyService.validateApiKey` for this.
    (0, globals_1.describe)('POST /api/partners/exchange/cases', () => {
        (0, globals_1.it)('should exchange case data with valid API key', async () => {
            const mockApiKey = {
                id: 'key-id',
                tenant_id: 'source-tenant',
                scopes: ['exchange:all']
            };
            mockValidateApiKey.mockResolvedValue(mockApiKey);
            mockShareCase.mockResolvedValue({ success: true, transferId: '123' });
            const res = await (0, supertest_1.default)(app)
                .post('/api/partners/exchange/cases')
                .set('X-API-Key', 'sk_live_valid')
                .send({
                targetPartner: 'target-agency',
                caseData: { id: 'case-1' }
            });
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body).toEqual({ success: true, transferId: '123' });
            (0, globals_1.expect)(apiKeyService.validateApiKey).toHaveBeenCalledWith('sk_live_valid');
            (0, globals_1.expect)(partnerService.shareCase).toHaveBeenCalledWith('source-tenant', 'target-agency', { id: 'case-1' });
        });
        (0, globals_1.it)('should reject without API Key', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/partners/exchange/cases')
                .send({ targetPartner: 'target', caseData: {} });
            (0, globals_1.expect)(res.status).toBe(401);
        });
        (0, globals_1.it)('should reject invalid API Key', async () => {
            mockValidateApiKey.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(app)
                .post('/api/partners/exchange/cases')
                .set('X-API-Key', 'invalid')
                .send({ targetPartner: 'target', caseData: {} });
            (0, globals_1.expect)(res.status).toBe(403);
        });
    });
});
