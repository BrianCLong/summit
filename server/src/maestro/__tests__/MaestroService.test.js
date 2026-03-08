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
    list: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('../runs/runs-repo.js', () => ({
    runsRepo: mockRunsRepo,
}));
(0, globals_1.describe)('MaestroService', () => {
    let MaestroService;
    let service;
    (0, globals_1.beforeAll)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../MaestroService.js')));
        MaestroService = module.MaestroService;
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        service = MaestroService.getInstance();
        // Reset private cache for test isolation.
        service.dbCache = null;
    });
    (0, globals_1.it)('should calculate health snapshot correctly', async () => {
        const now = new Date();
        mockRunsRepo.list.mockResolvedValue([
            {
                id: 'run-1',
                pipeline_id: 'pipe-1',
                pipeline: 'pipeline-a',
                status: 'succeeded',
                cost: 0,
                created_at: now,
                updated_at: now,
                tenant_id: 'tenant-1',
            },
            {
                id: 'run-2',
                pipeline_id: 'pipe-1',
                pipeline: 'pipeline-a',
                status: 'succeeded',
                cost: 0,
                created_at: now,
                updated_at: now,
                tenant_id: 'tenant-1',
            },
        ]);
        const snapshot = await service.getHealthSnapshot('tenant-1');
        (0, globals_1.expect)(snapshot.overallScore).toBe(100);
        (0, globals_1.expect)(snapshot.workstreams[0].status).toBe('healthy');
    });
    (0, globals_1.it)('should degrade health on failures', async () => {
        const now = new Date();
        const failures = Array(10).fill({
            id: 'run-fail',
            pipeline_id: 'pipe-1',
            pipeline: 'pipeline-a',
            status: 'failed',
            cost: 0,
            created_at: now,
            updated_at: now,
            tenant_id: 'tenant-1',
        });
        mockRunsRepo.list.mockResolvedValue(failures);
        const snapshot = await service.getHealthSnapshot('tenant-1');
        (0, globals_1.expect)(snapshot.overallScore).toBeLessThan(90);
    });
    (0, globals_1.it)('should toggle autonomic loops', async () => {
        const result = await service.toggleLoop('cost-optimization', 'paused', 'user-1');
        (0, globals_1.expect)(result).toBe(true);
        const loop = (await service.getControlLoops()).find((entry) => entry.id === 'cost-optimization');
        (0, globals_1.expect)(loop?.status).toBe('paused');
    });
});
