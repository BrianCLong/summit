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
const secretManager_js_1 = require("../secretManager.js");
const mockedAxios = {
    get: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('axios', () => ({
    __esModule: true,
    default: mockedAxios,
    get: mockedAxios.get,
}));
globals_1.jest.unstable_mockModule('../../middleware/auth.js', () => ({
    ensureAuthenticated: (_req, _res, next) => next(),
    requirePermission: () => (_req, _res, next) => next(),
    ensureRole: () => (_req, _res, next) => next(),
}));
globals_1.jest.unstable_mockModule('../../middleware/authorization.js', () => ({
    authorize: () => (_req, _res, next) => next(),
}));
const secretManager = new secretManager_js_1.SecretManager();
(0, globals_1.describe)('Admin Routes Security', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        const { default: adminRouter } = await Promise.resolve().then(() => __importStar(require('../../routes/admin.js')));
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/admin', adminRouter);
    });
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        await secretManager.setSecret('TEST_SECRET', 'current', 'secret-value-1');
        await secretManager.setSecret('TEST_SECRET', 'v2', 'secret-value-2');
    });
    (0, globals_1.it)('should rotate secrets successfully', async () => {
        mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });
        const res = await (0, supertest_1.default)(app).post('/admin/secrets/rotate').send({
            secretName: 'TEST_SECRET',
            newVersion: 'v2',
            services: ['test-service-1', 'test-service-2'],
        });
        (0, globals_1.expect)(res.statusCode).toEqual(200);
        (0, globals_1.expect)(res.body.message).toEqual('Secret rotation completed successfully');
        (0, globals_1.expect)(await secretManager.getSecret('TEST_SECRET', 'current')).toEqual('secret-value-2');
        (0, globals_1.expect)(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4001/health', globals_1.expect.objectContaining({ timeout: 5000 }));
        (0, globals_1.expect)(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4002/health', globals_1.expect.objectContaining({ timeout: 5000 }));
    });
    (0, globals_1.it)('should roll back if health check fails', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: { status: 'ok' } });
        mockedAxios.get.mockResolvedValueOnce({ data: { status: 'error' } });
        const res = await (0, supertest_1.default)(app).post('/admin/secrets/rotate').send({
            secretName: 'TEST_SECRET',
            newVersion: 'v2',
            services: ['test-service-1', 'test-service-2'],
        });
        (0, globals_1.expect)(res.statusCode).toEqual(500);
        (0, globals_1.expect)(res.body.error).toEqual('Service test-service-2 failed to restart with new secret');
        (0, globals_1.expect)(await secretManager.getSecret('TEST_SECRET', 'current')).toEqual('secret-value-1');
    });
    (0, globals_1.it)('should return an error if parameters are missing', async () => {
        const res = await (0, supertest_1.default)(app).post('/admin/secrets/rotate').send({
            secretName: 'TEST_SECRET',
        });
        (0, globals_1.expect)(res.statusCode).toEqual(400);
        (0, globals_1.expect)(res.body.error).toEqual('Missing required parameters');
    });
});
