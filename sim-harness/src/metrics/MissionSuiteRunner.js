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
exports.MissionSuiteRunner = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ScenarioGenerator_js_1 = require("../generators/ScenarioGenerator.js");
const GhostAnalyst_js_1 = require("../drivers/GhostAnalyst.js");
const MetricsCollector_js_1 = require("./MetricsCollector.js");
const Logger_js_1 = require("../utils/Logger.js");
const DEFAULT_SUITES = [
    {
        name: 'investigation-quality',
        description: 'End-to-end analyst workflow coverage with completion, correctness, and latency benchmarks.',
        scenarios: [
            { name: 'Fraud completion', scenario: 'fraud-ring', size: 'medium', noise: 0.1 },
            { name: 'Terror intel', scenario: 'terror-cell', size: 'medium', noise: 0.15 },
            { name: 'Corruption graph', scenario: 'corruption-network', size: 'large', noise: 0.2 },
        ],
        thresholds: {
            maxLatencyRegressionPct: 0.1,
            maxSuccessDropPct: 0.05,
            maxFalseLinkRate: 0.05,
            minCitationCorrectness: 0.9,
            maxLeakageIncidents: 0,
        },
    },
    {
        name: 'resilience-latency',
        description: 'Stress scenarios emphasizing p95 latency and data hygiene.',
        scenarios: [
            { name: 'Supply chain surge', scenario: 'supply-chain', size: 'large', noise: 0.25 },
            { name: 'Laundering spike', scenario: 'money-laundering', size: 'large', noise: 0.3 },
        ],
        thresholds: {
            maxLatencyRegressionPct: 0.15,
            maxSuccessDropPct: 0.07,
            maxFalseLinkRate: 0.08,
            minCitationCorrectness: 0.85,
            maxLeakageIncidents: 0,
        },
    },
];
class MissionSuiteRunner {
    config;
    generator;
    analyst;
    logger;
    constructor(config) {
        this.config = config;
        this.generator = new ScenarioGenerator_js_1.ScenarioGenerator();
        this.analyst = new GhostAnalyst_js_1.GhostAnalyst(config);
        this.logger = new Logger_js_1.Logger('MissionSuiteRunner');
    }
    async runSuite(suiteName, options = {}) {
        const suite = DEFAULT_SUITES.find((definition) => definition.name === suiteName);
        if (!suite) {
            throw new Error(`Mission suite not found: ${suiteName}`);
        }
        const runs = [];
        for (const mission of suite.scenarios) {
            const metrics = options.scenarioExecutor
                ? await options.scenarioExecutor(mission)
                : await this.executeScenario(mission);
            runs.push(metrics);
        }
        const aggregated = this.aggregate(runs);
        const baseline = options.baselineMetricsPath
            ? this.loadBaseline(options.baselineMetricsPath)
            : undefined;
        const { regressions, improvements } = this.detectRegressions(aggregated, baseline, suite.thresholds);
        const reportPath = this.persistSuiteResult(suite, runs, aggregated, options.outputDir, options.label || 'candidate');
        return { suite, runs, aggregated, baseline, regressions, improvements, reportPath };
    }
    async executeScenario(mission) {
        const params = {
            type: mission.scenario,
            size: mission.size || this.config.scenarios.defaultSize,
            noiseLevel: mission.noise ?? this.config.scenarios.defaultNoise,
            missingDataRate: 0.05,
            conflictingEvidenceRate: 0.05,
            seed: this.config.scenarios.seed,
        };
        const scenarioData = await this.generator.generate(params);
        const workflow = this.buildDefaultWorkflow(scenarioData);
        const session = await this.analyst.runWorkflow(workflow, scenarioData);
        return session.metrics;
    }
    buildDefaultWorkflow(scenarioData) {
        const steps = [
            { type: 'CREATE_INVESTIGATION', params: {} },
        ];
        scenarioData.entities.forEach((_, index) => {
            steps.push({ type: 'ADD_ENTITY', params: { entityIndex: index } });
        });
        scenarioData.relationships.forEach((_, index) => {
            steps.push({ type: 'ADD_RELATIONSHIP', params: { relationshipIndex: index } });
        });
        steps.push({ type: 'QUERY_ENTITIES', params: {} }, { type: 'QUERY_RELATIONSHIPS', params: {} }, { type: 'RUN_COPILOT', params: { goal: scenarioData.copilotGoal } }, { type: 'EXPORT_DATA', params: {} });
        return {
            name: `Mission Suite Workflow for ${scenarioData.investigation.name}`,
            description: 'Mission suite workflow auto-generated for regression tracking.',
            strategy: 'systematic',
            steps,
        };
    }
    aggregate(runs) {
        const collector = new MetricsCollector_js_1.MetricsCollector();
        return collector.aggregateMetrics(runs);
    }
    loadBaseline(filepath) {
        if (!fs.existsSync(filepath)) {
            this.logger.warn(`Baseline metrics file not found: ${filepath}`);
            return undefined;
        }
        const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        if (content.aggregated) {
            return content.aggregated;
        }
        if (content.completedSessions) {
            const collector = new MetricsCollector_js_1.MetricsCollector();
            return collector.aggregateMetrics(content.completedSessions);
        }
        this.logger.warn(`Baseline metrics file did not contain known structure: ${filepath}`);
        return undefined;
    }
    detectRegressions(candidate, baseline, thresholds) {
        if (!baseline) {
            return { regressions: [], improvements: ['No baseline provided; recording candidate metrics.'] };
        }
        const regressions = [];
        const improvements = [];
        const successDelta = candidate.averageSuccessRate - baseline.averageSuccessRate;
        if (successDelta < -thresholds.maxSuccessDropPct) {
            regressions.push(`Investigation completion rate dropped by ${(successDelta * 100).toFixed(2)}% (threshold ${thresholds.maxSuccessDropPct * 100}%)`);
        }
        else if (successDelta > 0) {
            improvements.push(`Investigation completion rate improved by ${(successDelta * 100).toFixed(2)}%`);
        }
        const latencyDelta = (candidate.p95Latency || 0) - (baseline.p95Latency || 0);
        if (baseline.p95Latency && latencyDelta > baseline.p95Latency * thresholds.maxLatencyRegressionPct) {
            regressions.push(`p95 latency regressed by ${latencyDelta.toFixed(2)}ms (threshold ${(thresholds.maxLatencyRegressionPct * 100).toFixed(1)}%)`);
        }
        if ((candidate.averageCitationCorrectness || 1) < thresholds.minCitationCorrectness) {
            regressions.push(`Citation correctness below target: ${(candidate.averageCitationCorrectness || 0).toFixed(2)} < ${thresholds.minCitationCorrectness}`);
        }
        if ((candidate.averageFalseLinkRate || 0) > thresholds.maxFalseLinkRate) {
            regressions.push(`False-link rate exceeds limit: ${(candidate.averageFalseLinkRate || 0).toFixed(3)} > ${thresholds.maxFalseLinkRate}`);
        }
        if ((candidate.averageLeakageIncidents || 0) > thresholds.maxLeakageIncidents) {
            regressions.push(`Leakage findings detected: ${(candidate.averageLeakageIncidents || 0).toFixed(0)} incidents`);
        }
        return { regressions, improvements };
    }
    persistSuiteResult(suite, runs, aggregated, outputDir, label) {
        const targetDir = outputDir || path.join(process.cwd(), 'reports');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const payload = {
            suite: suite.name,
            generatedAt: new Date().toISOString(),
            runs,
            aggregated,
            label,
        };
        const filename = path.join(targetDir, `${suite.name}-${label}-metrics.json`);
        fs.writeFileSync(filename, JSON.stringify(payload, null, 2), 'utf8');
        this.logger.info(`Mission suite metrics saved to ${filename}`);
        return filename;
    }
}
exports.MissionSuiteRunner = MissionSuiteRunner;
