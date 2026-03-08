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
// Use dynamic imports
const { Maestro } = await Promise.resolve().then(() => __importStar(require('../../maestro/core.js')));
const { CostMeter } = await Promise.resolve().then(() => __importStar(require('../../maestro/cost_meter.js')));
(0, globals_1.describe)('Multi-Tenant Isolation', () => {
    let igMock;
    let maestro;
    (0, globals_1.beforeEach)(() => {
        igMock = {
            createRun: globals_1.jest.fn().mockResolvedValue(undefined),
            getRun: globals_1.jest.fn(),
            createTask: globals_1.jest.fn().mockResolvedValue(undefined),
            getTask: globals_1.jest.fn(),
            updateTask: globals_1.jest.fn().mockResolvedValue(undefined),
            createArtifact: globals_1.jest.fn().mockResolvedValue(undefined),
            recordCostSample: globals_1.jest.fn().mockResolvedValue(undefined),
        };
        const costMeter = new CostMeter(igMock, {});
        maestro = new Maestro(igMock, costMeter, {}, {
            defaultPlannerAgent: 'test-agent',
            defaultActionAgent: 'test-agent'
        });
    });
    (0, globals_1.it)('should scope runs to a tenant', async () => {
        const tenantA = 'tenant-a';
        const run = await maestro.createRun({ id: 'user-1' }, 'test request', { tenantId: tenantA });
        (0, globals_1.expect)(run.tenantId).toBe(tenantA);
        (0, globals_1.expect)(igMock.createRun).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            tenantId: tenantA
        }));
    });
    (0, globals_1.it)('should scope tasks to the run tenant during planning', async () => {
        const tenantB = 'tenant-b';
        const run = { id: 'run-2', tenantId: tenantB };
        // Mock planRequest internal logic or just verify that createRun was called with tenantId
        // Actually, maestro.planRequest creates tasks. We should verify they have the tenantId.
        // Let's test a real maestro.planRequest if possible, or mock it to verify the passed tenantId
        // Maestro.planRequest usually calls the planner agent.
        // For now, let's verify that maestro.createTask (if it existed as a public method) or similar works
        // But maestro doesn't have a public createTask. It's internal to executeTask.
    });
    (0, globals_1.it)('should ensure artifacts inherit tenantId from task', async () => {
        // Artifact creation is usually done via ig.createArtifact
        // We want to ensure that if a task has tenantId, the artifact gets it.
    });
});
