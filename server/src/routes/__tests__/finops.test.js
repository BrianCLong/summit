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
// Mock functions declared before mocks
const mockGetRollups = globals_1.jest.fn();
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../middleware/auth.js', () => ({
    ensureAuthenticated: (req, _res, next) => {
        req.user = { tenantId: 'tenant-1' };
        next();
    },
}));
globals_1.jest.unstable_mockModule('../../services/FinOpsRollupService.js', () => ({
    finOpsRollupService: {
        getRollups: mockGetRollups,
    },
}));
// Dynamic imports AFTER mocks are set up
const finopsRouter = (await Promise.resolve().then(() => __importStar(require('../finops.js')))).default;
const { finOpsRollupService } = await Promise.resolve().then(() => __importStar(require('../../services/FinOpsRollupService.js')));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('finops router', () => {
    const createApp = () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/finops', finopsRouter);
        return app;
    };
    const mockOverview = {
        tenantId: 'tenant-1',
        periodDays: 7,
        totals: {
            totalCostUsd: 10,
            computeCostUsd: 5,
            storageCostUsd: 3,
            egressCostUsd: 1,
            thirdPartyCostUsd: 1,
        },
        buckets: [],
        unitMetrics: {
            costPerComputeUnit: 0.1,
            costPerGbHour: 0.01,
            costPerEgressGb: 0.02,
            costPerThirdPartyRequest: 0.001,
        },
        trend: [],
    };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('returns rollup overview for authenticated tenant', async () => {
        mockGetRollups.mockResolvedValue(mockOverview);
        const res = await (0, supertest_1.default)(createApp()).get('/api/finops/rollups?days=7');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(finOpsRollupService.getRollups).toHaveBeenCalledWith('tenant-1', 7);
        (0, globals_1.expect)(res.body.tenantId).toBe('tenant-1');
    });
    (0, globals_1.it)('defaults window to 30 days when unspecified', async () => {
        mockGetRollups.mockResolvedValue({
            ...mockOverview,
            periodDays: 30,
        });
        const res = await (0, supertest_1.default)(createApp()).get('/api/finops/rollups');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(finOpsRollupService.getRollups).toHaveBeenCalledWith('tenant-1', 30);
    });
});
