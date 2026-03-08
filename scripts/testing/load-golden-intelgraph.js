"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listGoldenGraphScenarios = listGoldenGraphScenarios;
exports.loadGoldenIntelGraph = loadGoldenIntelGraph;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const index_js_1 = require("../../ga-graphai/packages/knowledge-graph/src/index.js");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
const FIXTURE_PATH = path_1.default.resolve(__dirname, '../../testdata/intelgraph/golden-graph.json');
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
function listGoldenGraphScenarios() {
    const dataset = readDataset();
    return Object.keys(dataset.scenarios);
}
async function loadGoldenIntelGraph(options = {}) {
    assertTestEnv();
    const dataset = readDataset();
    const key = options.scenario ?? 'realistic-medium';
    const scenario = dataset.scenarios[key];
    if (!scenario) {
        throw new Error(`Unknown IntelGraph scenario: ${key}`);
    }
    const graph = new index_js_1.OrchestrationKnowledgeGraph();
    const pipelineConnector = {
        async loadPipelines() {
            return scenario.pipelines.map((pipeline) => ({ ...pipeline }));
        },
    };
    const serviceConnector = {
        async loadServices() {
            return scenario.services.map((service) => ({ ...service }));
        },
    };
    const environmentConnector = {
        async loadEnvironments() {
            return scenario.environments.map((environment) => ({ ...environment }));
        },
    };
    const incidentConnector = {
        async loadIncidents() {
            return scenario.incidents.map((incident) => ({ ...incident }));
        },
    };
    const policyConnector = {
        async loadPolicies() {
            return scenario.policies.map((policy) => ({ ...policy }));
        },
    };
    const costSignalConnector = {
        async loadCostSignals() {
            return scenario.costSignals.map((signal) => ({ ...signal }));
        },
    };
    graph.registerPipelineConnector(pipelineConnector);
    graph.registerServiceConnector(serviceConnector);
    graph.registerEnvironmentConnector(environmentConnector);
    graph.registerIncidentConnector(incidentConnector);
    graph.registerPolicyConnector(policyConnector);
    graph.registerCostSignalConnector(costSignalConnector);
    await graph.refresh();
    return { graph, scenario };
}
