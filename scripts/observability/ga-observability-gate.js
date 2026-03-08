"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIRED_SERVICES = void 0;
exports.loadSloConfig = loadSloConfig;
exports.validateSloCoverage = validateSloCoverage;
exports.evaluateObservabilityGate = evaluateObservabilityGate;
// @ts-nocheck
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
exports.REQUIRED_SERVICES = [
    'api-gateway',
    'intelgraph-api',
    'llm-orchestrator',
    'ingestion-pipeline',
];
const REQUIRED_METRIC_KEYS = ['availability', 'latency', 'errors'];
function loadSloConfig(configPath) {
    const resolvedPath = configPath || node_path_1.default.resolve(process.cwd(), 'config', 'slo.yaml');
    if (!node_fs_1.default.existsSync(resolvedPath)) {
        throw new Error(`Missing SLO config at ${resolvedPath}`);
    }
    const raw = node_fs_1.default.readFileSync(resolvedPath, 'utf8');
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (error) {
        throw new Error(`Unable to parse SLO config as JSON/YAML-safe content: ${error.message}`);
    }
    if (!parsed.services?.length) {
        throw new Error('SLO config must include at least one service entry');
    }
    if (!parsed.error_budget_policy) {
        throw new Error('SLO config missing error_budget_policy definition');
    }
    return parsed;
}
function validateSloCoverage(config, observedServices = [...exports.REQUIRED_SERVICES]) {
    const errors = [];
    const warnings = [];
    const serviceMap = new Map(config.services.map((svc) => [svc.name, svc]));
    const missingServices = observedServices.filter((svc) => !serviceMap.has(svc));
    if (missingServices.length) {
        errors.push(`Missing SLO definitions for services: ${missingServices.join(', ')}`);
    }
    for (const service of config.services) {
        const missingMetrics = REQUIRED_METRIC_KEYS.filter((key) => !service.metrics?.[key]);
        if (missingMetrics.length) {
            errors.push(`${service.name}: missing required metrics (${missingMetrics.join(', ')})`);
        }
        if (service.tier === 'critical' && !service.objectives?.availability) {
            errors.push(`${service.name}: critical service missing availability SLO`);
        }
        if (!service.objectives?.latency_p95_ms) {
            errors.push(`${service.name}: missing latency_p95_ms objective`);
        }
        if (service.objectives?.error_rate_percent === undefined) {
            errors.push(`${service.name}: missing error_rate_percent objective`);
        }
    }
    if (!config.error_budget_policy?.actions?.length) {
        warnings.push('error_budget_policy.actions is empty');
    }
    return {
        ok: errors.length === 0,
        errors,
        warnings,
        missingServices,
    };
}
function evaluateObservabilityGate(configPath, observedServices = [...exports.REQUIRED_SERVICES]) {
    const config = loadSloConfig(configPath);
    return validateSloCoverage(config, observedServices);
}
