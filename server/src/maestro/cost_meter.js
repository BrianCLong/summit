"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostMeter = void 0;
// @ts-nocheck
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const api_1 = require("@opentelemetry/api");
const meter = api_1.metrics.getMeter('maestro-llm-observability');
const costCounter = meter.createCounter('llm_cost_usd_total', {
    description: 'Estimated LLM spend in USD',
});
const tokenCounter = meter.createCounter('llm_tokens_total', {
    description: 'Total LLM tokens consumed by segment',
});
class CostMeter {
    ig;
    pricingTable;
    constructor(ig, pricingTable, options = {}) {
        this.ig = ig;
        this.pricingTable = pricingTable;
        this.usageLogPath =
            options.usageLogPath || process.env.LLM_USAGE_LOG_PATH || 'logs/llm-usage.ndjson';
        this.defaultEnvironment =
            options.defaultEnvironment ||
                process.env.LLM_ENVIRONMENT ||
                process.env.NODE_ENV ||
                'unknown';
    }
    usageLogPath;
    defaultEnvironment;
    estimateCost(usage) {
        const key = `${usage.vendor}:${usage.model}`;
        const pricing = this.pricingTable[key];
        if (!pricing)
            return 0;
        const inCost = (usage.inputTokens / 1000) * pricing.inputPer1K;
        const outCost = (usage.outputTokens / 1000) * pricing.outputPer1K;
        return inCost + outCost;
    }
    async record(runId, taskId, usage, metadata = {}) {
        const cost = this.estimateCost(usage);
        const sample = {
            id: node_crypto_1.default.randomUUID(),
            runId,
            taskId,
            model: usage.model,
            vendor: usage.vendor,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            currency: 'USD',
            cost,
            createdAt: new Date().toISOString(),
            feature: metadata.feature,
            tenantId: metadata.tenantId,
            environment: metadata.environment || this.defaultEnvironment,
        };
        await this.ig.recordCostSample(sample);
        this.emitMetrics(sample);
        this.appendUsageLog(sample, metadata.traceId);
        return sample;
    }
    async summarize(runId) {
        return this.ig.getRunCostSummary(runId);
    }
    emitMetrics(sample) {
        const attributes = {
            vendor: sample.vendor,
            model: sample.model,
            feature: sample.feature || 'unspecified',
            tenant: sample.tenantId || 'unspecified',
            environment: sample.environment || this.defaultEnvironment,
        };
        costCounter.add(sample.cost, attributes);
        tokenCounter.add(sample.inputTokens, { ...attributes, segment: 'prompt' });
        tokenCounter.add(sample.outputTokens, { ...attributes, segment: 'completion' });
    }
    appendUsageLog(sample, traceId) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            traceId,
            vendor: sample.vendor,
            model: sample.model,
            inputTokens: sample.inputTokens,
            outputTokens: sample.outputTokens,
            cost: sample.cost,
            currency: sample.currency,
            feature: sample.feature,
            tenantId: sample.tenantId,
            environment: sample.environment || this.defaultEnvironment,
        };
        const logDir = node_path_1.default.dirname(this.usageLogPath);
        node_fs_1.default.mkdirSync(logDir, { recursive: true });
        node_fs_1.default.appendFileSync(this.usageLogPath, `${JSON.stringify(logEntry)}\n`);
    }
}
exports.CostMeter = CostMeter;
