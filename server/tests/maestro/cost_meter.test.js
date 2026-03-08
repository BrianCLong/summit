"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const cost_meter_1 = require("../../src/maestro/cost_meter");
const client_1 = require("../../src/intelgraph/client");
(0, globals_1.describe)('CostMeter', () => {
    let costMeter;
    let ig;
    let logPath;
    const pricingTable = {
        'openai:gpt-4': { inputPer1K: 0.03, outputPer1K: 0.06 },
    };
    (0, globals_1.beforeEach)(() => {
        ig = new client_1.IntelGraphClientImpl();
        logPath = node_path_1.default.join(node_os_1.default.tmpdir(), `llm-usage-${node_crypto_1.default.randomUUID()}.ndjson`);
        costMeter = new cost_meter_1.CostMeter(ig, pricingTable, { usageLogPath: logPath, defaultEnvironment: 'test' });
    });
    (0, globals_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(logPath)) {
            node_fs_1.default.rmSync(logPath);
        }
    });
    (0, globals_1.it)('should estimate cost correctly', () => {
        const cost = costMeter.estimateCost({
            model: 'gpt-4',
            vendor: 'openai',
            inputTokens: 1000,
            outputTokens: 1000,
        });
        // 1000/1000 * 0.03 + 1000/1000 * 0.06 = 0.09
        (0, globals_1.expect)(cost).toBeCloseTo(0.09);
    });
    (0, globals_1.it)('should return 0 for unknown model', () => {
        const cost = costMeter.estimateCost({
            model: 'unknown-model',
            vendor: 'openai',
            inputTokens: 1000,
            outputTokens: 1000,
        });
        (0, globals_1.expect)(cost).toBe(0);
    });
    (0, globals_1.it)('should record cost sample', async () => {
        const sample = await costMeter.record('run-1', 'task-1', {
            model: 'gpt-4',
            vendor: 'openai',
            inputTokens: 1000,
            outputTokens: 1000,
        }, { feature: 'unit-test', tenantId: 'tenant-a', environment: 'test' });
        (0, globals_1.expect)(sample.cost).toBeCloseTo(0.09);
        (0, globals_1.expect)(sample.runId).toBe('run-1');
        const summary = await costMeter.summarize('run-1');
        (0, globals_1.expect)(summary.totalCostUSD).toBeCloseTo(0.09);
        (0, globals_1.expect)(summary.totalInputTokens).toBe(1000);
        const log = node_fs_1.default.readFileSync(logPath, 'utf8').trim();
        const parsed = JSON.parse(log);
        (0, globals_1.expect)(parsed.feature).toBe('unit-test');
        (0, globals_1.expect)(parsed.tenantId).toBe('tenant-a');
    });
});
