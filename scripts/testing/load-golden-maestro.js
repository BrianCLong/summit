"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listGoldenMaestroScenarios = listGoldenMaestroScenarios;
exports.loadGoldenMaestro = loadGoldenMaestro;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const maestro_conductor_js_1 = require("../../ga-graphai/packages/maestro-conductor/src/maestro-conductor.js");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
const FIXTURE_PATH = path_1.default.resolve(__dirname, '../../testdata/maestro/golden-runs.json');
let cachedDataset;
function readDataset() {
    if (!cachedDataset) {
        const raw = fs_1.default.readFileSync(FIXTURE_PATH, 'utf-8');
        cachedDataset = JSON.parse(raw);
    }
    return cachedDataset;
}
function assertTestEnv() {
    const env = process.env.NODE_ENV ?? '';
    const allow = process.env.ALLOW_GOLDEN_FIXTURES === 'true';
    if (env.toLowerCase() === 'production' && !allow) {
        throw new Error('Golden fixtures must not be loaded in production');
    }
}
function buildPolicyHook(definition) {
    return {
        id: definition.id,
        description: definition.description,
        evaluate: ({ asset, job }) => {
            for (const rule of definition.rules) {
                if (rule.type === 'require-tag') {
                    const isSensitive = Boolean(job?.metadata?.[rule.metadataKey]);
                    if (isSensitive) {
                        const compliance = asset.labels?.compliance ?? '';
                        if (!compliance.includes(rule.requiredTag)) {
                            return { allowed: false, reason: `${rule.requiredTag} required` };
                        }
                    }
                }
            }
            return { allowed: true, reason: 'policy:approved' };
        },
    };
}
function buildResponseStrategy(definition, executionLog) {
    return {
        id: definition.id,
        description: definition.description,
        supports: (asset) => {
            const metadataKey = definition.supports.metadataKey;
            return metadataKey ? Boolean(asset.metadata?.[metadataKey]) : true;
        },
        shouldTrigger: (context) => context.anomaly.severity !== 'low',
        async execute(context) {
            const metadataKey = definition.supports.metadataKey;
            const target = metadataKey
                ? context.asset.metadata?.[metadataKey]
                : undefined;
            const actions = definition.actions.map((action) => ({
                type: action.type,
                targetAssetId: target,
                payload: action.payload,
                estimatedImpact: action.impact,
                runbook: action.runbook,
            }));
            executionLog.push(`${context.asset.id}->${target ?? 'none'}:${definition.id}`);
            return {
                strategyId: definition.id,
                executed: true,
                actions,
                notes: definition.description,
            };
        },
        cooldownMs: definition.cooldownMs,
    };
}
function toJobSpec(run) {
    return {
        id: run.id,
        type: run.type,
        priority: run.priority,
        requiredCapabilities: run.requiredCapabilities,
        requirements: run.requirements,
        metadata: run.metadata,
    };
}
function listGoldenMaestroScenarios() {
    return Object.keys(readDataset().scenarios);
}
async function loadGoldenMaestro(options = {}) {
    assertTestEnv();
    const dataset = readDataset();
    const key = options.scenario ?? 'control-loop';
    const scenario = dataset.scenarios[key];
    if (!scenario) {
        throw new Error(`Unknown Maestro scenario: ${key}`);
    }
    const conductor = new maestro_conductor_js_1.MaestroConductor({
        anomaly: { windowSize: 6, minSamples: 4, zThreshold: 1.2 },
        selfHealing: { defaultCooldownMs: 1 },
        optimizer: {
            windowSize: 12,
            latencyThresholdMs: 200,
            errorRateThreshold: 0.08,
            saturationThreshold: 0.7,
        },
        jobRouter: { latencyWeight: 0.4 },
    });
    const executionLog = [];
    const provider = {
        id: `${key}-fixture-provider`,
        description: scenario.description,
        async scan() {
            return scenario.assets.map((asset) => ({ ...asset, lastSeen: new Date(scenario.healthSignals[0]?.timestamp ?? Date.now()) }));
        },
    };
    conductor.registerDiscoveryProvider(provider);
    scenario.policyHooks.forEach((definition) => conductor.registerPolicyHook(buildPolicyHook(definition)));
    scenario.responseStrategies.forEach((definition) => conductor.registerResponseStrategy(buildResponseStrategy(definition, executionLog)));
    await conductor.scanAssets();
    for (const signal of scenario.healthSignals) {
        await conductor.ingestHealthSignal({ ...signal, timestamp: new Date(signal.timestamp) });
    }
    const jobs = scenario.runs.map(toJobSpec);
    return { conductor, scenario, executionLog, jobs };
}
