"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const admin_js_1 = __importDefault(require("../admin.js"));
const secretManager_js_1 = require("../../services/secretManager.js");
const serviceRegistry_js_1 = require("../../services/serviceRegistry.js");
const axios_1 = __importDefault(require("axios"));
globals_1.jest.mock('axios');
const mockedAxios = axios_1.default;
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(admin_js_1.default);
const secretManager = new secretManager_js_1.SecretManager();
const serviceRegistry = new serviceRegistry_js_1.MockServiceRegistry();
(0, globals_1.describe)('Admin Routes', () => {
    (0, globals_1.beforeEach)(async () => {
        await secretManager.setSecret('TEST_SECRET', 'current', 'secret-value-1');
        await secretManager.setSecret('TEST_SECRET', 'v2', 'secret-value-2');
    });
    (0, globals_1.it)('should rotate secrets successfully', async () => {
        mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });
        const res = await (0, supertest_1.default)(app)
            .post('/admin/secrets/rotate')
            .send({
            secretName: 'TEST_SECRET',
            newVersion: 'v2',
            services: ['test-service-1', 'test-service-2'],
        });
        (0, globals_1.expect)(res.statusCode).toEqual(200);
        (0, globals_1.expect)(res.body.message).toEqual('Secret rotation completed successfully');
        (0, globals_1.expect)(await secretManager.getSecret('TEST_SECRET', 'current')).toEqual('secret-value-2');
        (0, globals_1.expect)(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4001/health');
        (0, globals_1.expect)(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4002/health');
    });
    (0, globals_1.it)('should roll back if health check fails', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: { status: 'ok' } });
        mockedAxios.get.mockResolvedValueOnce({ data: { status: 'error' } });
        const res = await (0, supertest_1.default)(app)
            .post('/admin/secrets/rotate')
            .send({
            secretName: 'TEST_SECRET',
            newVersion: 'v2',
            services: ['test-service-1', 'test-service-2'],
        });
        (0, globals_1.expect)(res.statusCode).toEqual(500);
        (0, globals_1.expect)(res.body.error).toEqual('Service test-service-2 failed to restart with new secret');
        (0, globals_1.expect)(await secretManager.getSecret('TEST_SECRET', 'current')).toEqual('secret-value-1');
    });
    (0, globals_1.it)('should return an error if parameters are missing', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/admin/secrets/rotate')
            .send({
            secretName: 'TEST_SECRET',
        });
        (0, globals_1.expect)(res.statusCode).toEqual(400);
        (0, globals_1.expect)(res.body.error).toEqual('Missing required parameters');
    });
});
