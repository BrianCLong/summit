"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const scheduler_api_js_1 = __importDefault(require("../scheduler-api.js"));
const cost_aware_scheduler_js_1 = require("../cost-aware-scheduler.js");
const selector_js_1 = require("../selector.js");
const pool_selection_audit_js_1 = require("../pool-selection-audit.js");
globals_1.jest.mock('../cost-aware-scheduler', () => ({
    costAwareScheduler: {
        schedule: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../selector.js', () => ({
    choosePool: globals_1.jest.fn(),
}));
globals_1.jest.mock('../pool-selection-audit', () => ({
    recordPoolSelectionAudit: globals_1.jest.fn(),
}));
const mockSchedule = cost_aware_scheduler_js_1.costAwareScheduler.schedule;
const mockChoosePool = selector_js_1.choosePool;
const mockAudit = pool_selection_audit_js_1.recordPoolSelectionAudit;
describe('scheduler-api pool selection', () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/', scheduler_api_js_1.default);
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        mockSchedule.mockResolvedValue({
            approved: true,
            queueName: 'light_normal',
            estimatedWaitTime: 0,
            budgetImpact: {
                currentUtilization: 0,
                projectedUtilization: 0,
                remainingBudget: 0,
            },
            reason: 'ok',
        });
    });
    it('propagates pool selection when estimates provided', async () => {
        mockChoosePool.mockResolvedValue({ id: 'pool-a', price: 0.42 });
        const res = await (0, supertest_1.default)(app).post('/schedule').send({
            expertType: 'graph_ops',
            tenantId: 'tenant-1',
            requestId: 'req-123',
            est: { cpuSec: 10, gbSec: 5, egressGb: 1 },
            residency: 'us-east',
            purpose: 'test-route',
        });
        expect(res.status).toBe(200);
        expect(mockChoosePool).toHaveBeenCalledWith({ cpuSec: 10, gbSec: 5, egressGb: 1 }, 'us-east');
        expect(mockSchedule).toHaveBeenCalledWith(expect.objectContaining({
            poolId: 'pool-a',
            poolPriceUsd: 0.42,
            est: { cpuSec: 10, gbSec: 5, egressGb: 1 },
            residency: 'us-east',
            purpose: 'test-route',
        }));
        expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({
            poolId: 'pool-a',
            poolPriceUsd: 0.42,
            residency: 'us-east',
        }));
    });
    it('schedules even when no pool is available', async () => {
        mockChoosePool.mockResolvedValue(null);
        const res = await (0, supertest_1.default)(app).post('/schedule').send({
            expertType: 'graph_ops',
            tenantId: 'tenant-1',
            requestId: 'req-456',
        });
        expect(res.status).toBe(200);
        expect(mockSchedule).toHaveBeenCalledWith(expect.objectContaining({
            poolId: undefined,
            poolPriceUsd: undefined,
            est: {},
            residency: undefined,
        }));
    });
});
