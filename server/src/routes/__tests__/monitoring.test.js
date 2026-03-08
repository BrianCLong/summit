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
const mockInc = globals_1.jest.fn();
const mockObserve = globals_1.jest.fn();
const mockSet = globals_1.jest.fn();
const mockMetrics = globals_1.jest.fn().mockResolvedValue('mocked_metrics');
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../monitoring/metrics', () => ({
    goldenPathStepTotal: { inc: mockInc },
    maestroDeploymentsTotal: { inc: mockInc },
    maestroPrLeadTimeHours: { observe: mockObserve },
    maestroChangeFailureRate: { set: mockSet },
    maestroMttrHours: { observe: mockObserve },
    uiErrorBoundaryCatchTotal: { inc: mockInc },
    register: {
        contentType: 'text/plain',
        metrics: mockMetrics,
    },
    webVitalValue: {
        set: mockSet,
    },
}));
// Dynamic imports AFTER mocks are set up
const monitoringRouter = (await Promise.resolve().then(() => __importStar(require('../monitoring.js')))).default;
const { goldenPathStepTotal, maestroDeploymentsTotal, maestroPrLeadTimeHours, uiErrorBoundaryCatchTotal, } = await Promise.resolve().then(() => __importStar(require('../../monitoring/metrics.js')));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/', monitoringRouter);
(0, globals_1.describe)('Monitoring Routes', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('POST /telemetry/events', () => {
        (0, globals_1.it)('should increment goldenPathStepTotal for golden_path_step event', async () => {
            const payload = {
                event: 'golden_path_step',
                labels: {
                    step: 'investigation_created',
                    status: 'success',
                },
            };
            const response = await (0, supertest_1.default)(app)
                .post('/telemetry/events')
                .set('x-tenant-id', 'test-tenant')
                .send(payload);
            (0, globals_1.expect)(response.status).toBe(202);
            (0, globals_1.expect)(goldenPathStepTotal.inc).toHaveBeenCalledWith({
                step: 'investigation_created',
                status: 'success',
                tenant_id: 'test-tenant',
            });
        });
        (0, globals_1.it)('should return 400 if event name is missing', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/telemetry/events')
                .send({ labels: {} });
            (0, globals_1.expect)(response.status).toBe(400);
        });
    });
    (0, globals_1.it)('should route ui_error_boundary telemetry to metrics', async () => {
        const payload = {
            event: 'ui_error_boundary',
            labels: {
                component: 'TestComponent',
                message: 'Boom',
            },
        };
        const response = await (0, supertest_1.default)(app)
            .post('/telemetry/events')
            .set('x-tenant-id', 'tenant-123')
            .send(payload);
        (0, globals_1.expect)(response.status).toBe(202);
        (0, globals_1.expect)(goldenPathStepTotal.inc).not.toHaveBeenCalled();
        (0, globals_1.expect)(maestroDeploymentsTotal.inc).not.toHaveBeenCalled();
        (0, globals_1.expect)(uiErrorBoundaryCatchTotal.inc).toHaveBeenCalledWith({
            component: 'TestComponent',
            tenant_id: 'tenant-123',
        });
    });
    (0, globals_1.describe)('POST /telemetry/dora', () => {
        (0, globals_1.it)('should increment maestroDeploymentsTotal for deployment metric', async () => {
            const payload = {
                metric: 'deployment',
                labels: {
                    environment: 'staging',
                    status: 'success',
                },
            };
            const response = await (0, supertest_1.default)(app).post('/telemetry/dora').send(payload);
            (0, globals_1.expect)(response.status).toBe(202);
            (0, globals_1.expect)(maestroDeploymentsTotal.inc).toHaveBeenCalledWith({
                environment: 'staging',
                status: 'success',
            });
        });
        (0, globals_1.it)('should observe lead time', async () => {
            const payload = {
                metric: 'lead_time',
                value: 12.5,
            };
            const response = await (0, supertest_1.default)(app).post('/telemetry/dora').send(payload);
            (0, globals_1.expect)(response.status).toBe(202);
            (0, globals_1.expect)(maestroPrLeadTimeHours.observe).toHaveBeenCalledWith(12.5);
        });
        (0, globals_1.it)('should return 400 for unknown metric', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/telemetry/dora')
                .send({ metric: 'unknown_metric' });
            (0, globals_1.expect)(response.status).toBe(400);
        });
    });
});
