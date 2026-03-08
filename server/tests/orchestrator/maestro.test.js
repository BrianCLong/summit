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
const system_monitor_1 = require("../../src/lib/system-monitor");
let maestro;
(0, globals_1.beforeAll)(async () => {
    ({ maestro } = await Promise.resolve().then(() => __importStar(require('../../src/orchestrator/maestro'))));
});
(0, globals_1.describe)('Maestro Orchestrator & RunManager', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        globals_1.jest.spyOn(system_monitor_1.systemMonitor, 'getHealth').mockReturnValue({
            isOverloaded: false,
            metrics: {
                cpuUsage: 0,
                memoryUsage: 0,
                uptime: 0,
                loadAverage: [0, 0, 0],
            },
        });
    });
    (0, globals_1.afterAll)(async () => {
        await maestro.shutdown();
    });
    (0, globals_1.it)('enqueues a task when policy allows it', async () => {
        const task = {
            kind: 'plan',
            repo: 'test-repo',
            issue: 'issue-123',
            budgetUSD: 10,
            context: {},
            metadata: {
                actor: 'test-user',
                timestamp: new Date().toISOString(),
                sprint_version: 'v1',
            },
        };
        const jobId = await maestro.enqueueTask(task);
        (0, globals_1.expect)(jobId).toBeDefined();
    });
    (0, globals_1.it)('rejects tasks that violate policy guardrails', async () => {
        const task = {
            kind: 'plan',
            repo: 'test-repo',
            issue: 'issue-oversized-budget',
            budgetUSD: 100,
            context: {},
            metadata: {
                actor: 'test-user',
                timestamp: new Date().toISOString(),
                sprint_version: 'v1',
            },
        };
        await (0, globals_1.expect)(maestro.enqueueTask(task)).rejects.toThrow(/policy/i);
    });
});
