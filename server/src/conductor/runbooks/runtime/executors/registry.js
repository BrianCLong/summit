"use strict";
/**
 * Step Executor Registry
 *
 * Central registry for all step executors.
 *
 * @module runbooks/runtime/executors/registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultStepExecutorRegistry = void 0;
exports.createExecutorRegistry = createExecutorRegistry;
exports.createNoOpRegistry = createNoOpRegistry;
exports.getGlobalExecutorRegistry = getGlobalExecutorRegistry;
exports.setGlobalExecutorRegistry = setGlobalExecutorRegistry;
exports.resetGlobalExecutorRegistry = resetGlobalExecutorRegistry;
const base_js_1 = require("./base.js");
const ingest_executor_js_1 = require("./ingest-executor.js");
const graph_lookup_executor_js_1 = require("./graph-lookup-executor.js");
const pattern_miner_executor_js_1 = require("./pattern-miner-executor.js");
const report_executor_js_1 = require("./report-executor.js");
const custom_executor_js_1 = require("./custom-executor.js");
/**
 * Default implementation of StepExecutorRegistry
 */
class DefaultStepExecutorRegistry {
    executors = new Map();
    register(executor) {
        this.executors.set(executor.actionType, executor);
    }
    getExecutor(actionType) {
        return this.executors.get(actionType);
    }
    hasExecutor(actionType) {
        return this.executors.has(actionType);
    }
    listExecutors() {
        return Array.from(this.executors.keys());
    }
}
exports.DefaultStepExecutorRegistry = DefaultStepExecutorRegistry;
/**
 * Create a fully configured executor registry
 */
function createExecutorRegistry(config = {}) {
    const registry = new DefaultStepExecutorRegistry();
    if (config.includeDefaults !== false) {
        // Register CTI executors
        registry.register(new ingest_executor_js_1.IngestStepExecutor(config.ingestService || new ingest_executor_js_1.DefaultIndicatorIngestService()));
        registry.register(new graph_lookup_executor_js_1.GraphLookupStepExecutor(config.infraService || new graph_lookup_executor_js_1.DefaultInfrastructureEnrichmentService()));
        registry.register(new pattern_miner_executor_js_1.PatternMinerStepExecutor(config.patternService || new pattern_miner_executor_js_1.DefaultPatternMinerService()));
        registry.register(new report_executor_js_1.ReportGeneratorStepExecutor(config.reportService || new report_executor_js_1.DefaultReportGeneratorService()));
        // Register utility executors
        registry.register(new custom_executor_js_1.CustomStepExecutor());
        registry.register(new custom_executor_js_1.NotifyStepExecutor());
        registry.register(new custom_executor_js_1.ValidateStepExecutor());
        registry.register(new custom_executor_js_1.TransformStepExecutor());
        registry.register(new custom_executor_js_1.EnrichIntelStepExecutor());
    }
    return registry;
}
/**
 * Create a minimal executor registry with NoOp executors
 */
function createNoOpRegistry() {
    const registry = new DefaultStepExecutorRegistry();
    const actionTypes = [
        'INGEST',
        'LOOKUP_GRAPH',
        'PATTERN_MINER',
        'ENRICH_INTEL',
        'GENERATE_REPORT',
        'NOTIFY',
        'VALIDATE',
        'TRANSFORM',
        'CUSTOM',
    ];
    for (const actionType of actionTypes) {
        registry.register(new base_js_1.NoOpExecutor(actionType));
    }
    return registry;
}
/**
 * Singleton registry instance
 */
let globalRegistry = null;
/**
 * Get the global executor registry
 */
function getGlobalExecutorRegistry() {
    if (!globalRegistry) {
        globalRegistry = createExecutorRegistry();
    }
    return globalRegistry;
}
/**
 * Set the global executor registry
 */
function setGlobalExecutorRegistry(registry) {
    globalRegistry = registry;
}
/**
 * Reset the global executor registry
 */
function resetGlobalExecutorRegistry() {
    globalRegistry = null;
}
