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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mockRunsRepo = {
    create: globals_1.jest.fn(),
    get: globals_1.jest.fn(),
    list: globals_1.jest.fn(),
    update: globals_1.jest.fn(),
    delete: globals_1.jest.fn(),
    getByPipeline: globals_1.jest.fn(),
    getRunForTenant: globals_1.jest.fn(),
};
const mockMetrics = {
    createCounter: globals_1.jest.fn(),
    createGauge: globals_1.jest.fn(),
    createHistogram: globals_1.jest.fn(),
    setGauge: globals_1.jest.fn(),
    incrementCounter: globals_1.jest.fn(),
    observeHistogram: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('../../maestro/runs/runs-repo.js', () => ({
    runsRepo: mockRunsRepo,
}));
globals_1.jest.unstable_mockModule('../../utils/metrics.js', () => ({
    PrometheusMetrics: globals_1.jest.fn().mockImplementation(() => mockMetrics),
}));
globals_1.jest.unstable_mockModule('../../utils/logger.js', () => ({
    default: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        child: globals_1.jest.fn().mockReturnThis(),
    },
}));
(0, globals_1.describe)('PipelineSmokeService', () => {
    let service;
    let PipelineSmokeService;
    (0, globals_1.beforeAll)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../../services/PipelineSmokeService.js')));
        PipelineSmokeService = module.PipelineSmokeService;
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        service = PipelineSmokeService.getInstance();
    });
    (0, globals_1.it)('should run a successful smoke test', async () => {
        const tenantId = 'test-tenant';
        const mockRun = {
            id: 'run-123',
            pipeline_id: 'smoke-test-pipeline',
            status: 'queued',
            created_at: new Date(),
            updated_at: new Date(),
            tenant_id: tenantId,
        };
        mockRunsRepo.create.mockResolvedValue(mockRun);
        mockRunsRepo.get.mockResolvedValueOnce({
            ...mockRun,
            status: 'succeeded',
            output_data: { foo: 'bar' },
        });
        const result = await service.runSmokeTest(tenantId, 'smoke-test-pipeline', 1000);
        (0, globals_1.expect)(result.success).toBe(true);
        (0, globals_1.expect)(result.runId).toBe('run-123');
        (0, globals_1.expect)(result.stages.creation).toBe(true);
        (0, globals_1.expect)(result.stages.completion).toBe(true);
        (0, globals_1.expect)(mockRunsRepo.create).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            tenant_id: tenantId,
            input_params: globals_1.expect.objectContaining({ synthetic: true }),
        }));
    });
    (0, globals_1.it)('should handle creation failure', async () => {
        mockRunsRepo.create.mockResolvedValue(null);
        const result = await service.runSmokeTest('test-tenant', 'smoke-test-pipeline', 1000);
        (0, globals_1.expect)(result.success).toBe(false);
        (0, globals_1.expect)(result.error).toContain('Failed to create run');
    });
    (0, globals_1.it)('should handle run failure', async () => {
        const tenantId = 'test-tenant';
        const mockRun = {
            id: 'run-123',
            pipeline_id: 'smoke-test-pipeline',
            status: 'queued',
            created_at: new Date(),
            updated_at: new Date(),
            tenant_id: tenantId,
        };
        mockRunsRepo.create.mockResolvedValue(mockRun);
        mockRunsRepo.get.mockResolvedValue({
            ...mockRun,
            status: 'failed',
            error_message: 'Pipeline exploded',
        });
        const result = await service.runSmokeTest(tenantId, 'smoke-test-pipeline', 1000);
        (0, globals_1.expect)(result.success).toBe(false);
        (0, globals_1.expect)(result.error).toContain('Run failed with status: failed');
    });
});
