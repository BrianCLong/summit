#!/usr/bin/env node
"use strict";
/**
 * CLI for IntelGraph Simulation Harness
 */
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
exports.main = main;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const index_js_1 = require("./index.js");
const MissionSuiteRunner_js_1 = require("./metrics/MissionSuiteRunner.js");
const logger = new index_js_1.Logger('CLI');
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--scenario':
            case '-s':
                options.scenario = args[++i];
                break;
            case '--config':
            case '-c':
                options.config = args[++i];
                break;
            case '--size':
                options.size = args[++i];
                break;
            case '--noise':
                options.noise = parseFloat(args[++i]);
                break;
            case '--seed':
                options.seed = parseInt(args[++i], 10);
                break;
            case '--report':
            case '-r':
                options.report = true;
                break;
            case '--output':
            case '-o':
                options.output = args[++i];
                break;
            case '--baseline':
                options.baseline = args[++i];
                break;
            case '--baseline-metrics':
                options.baselineMetrics = args[++i];
                break;
            case '--candidate':
                options.candidate = args[++i];
                break;
            case '--workflow':
            case '-w':
                options.workflow = args[++i];
                break;
            case '--mission-suite':
                options.missionSuite = args[++i];
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
            case '--version':
            case '-v':
                options.version = true;
                break;
            default:
                console.warn(`Unknown option: ${arg}`);
        }
    }
    return options;
}
function showHelp() {
    console.log(`
IntelGraph Simulation Harness CLI

Usage:
  sim-harness [options]

Options:
  -s, --scenario <type>     Scenario type (fraud-ring, terror-cell, corruption-network,
                            supply-chain, money-laundering, custom)
  -c, --config <file>       Configuration file path (JSON or YAML)
  -w, --workflow <file>     Workflow definition file (JSON or YAML)
  --size <size>             Graph size (small, medium, large, xlarge)
  --noise <level>           Noise level (0-1)
  --seed <number>           Random seed for deterministic generation
  -r, --report              Generate comparison report
  -o, --output <dir>        Output directory for reports
  --baseline <version>      Baseline version for comparison
  --baseline-metrics <file> Baseline metrics JSON for mission suite regression detection
  --candidate <version>     Candidate version for comparison
  --mission-suite <name>    Run a predefined mission suite (investigation-quality, resilience-latency)
  -h, --help                Show this help message
  -v, --version             Show version

Examples:
  # Run fraud ring scenario
  sim-harness --scenario fraud-ring --size large

  # Run with custom configuration
  sim-harness --config config/custom.yaml --scenario terror-cell

  # Run with custom workflow
  sim-harness --workflow workflows/investigation.yaml

  # Generate comparison report
  sim-harness --report --baseline v1.0.0 --candidate v1.1.0

  # Run all scenarios and generate report
  sim-harness --scenario all --report --output ./reports

Environment Variables:
  SIM_API_URL              API base URL
  SIM_GRAPHQL_URL          GraphQL endpoint URL
  SIM_GRAPH_SIZE           Default graph size
  SIM_NOISE_LEVEL          Default noise level
  SIM_SEED                 Random seed
  SIM_REPORT_DIR           Report output directory
  SIM_LOG_LEVEL            Log level (debug, info, warn, error)
  `);
}
function showVersion() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    console.log(`IntelGraph Simulation Harness v${packageJson.version}`);
}
async function runScenario(scenarioType, config, options) {
    logger.info(`Running scenario: ${scenarioType}`);
    // Generate scenario
    const generator = new index_js_1.ScenarioGenerator(options.seed || config.scenarios.seed);
    const params = {
        type: scenarioType,
        size: options.size || config.scenarios.defaultSize,
        noiseLevel: options.noise ?? config.scenarios.defaultNoise,
        missingDataRate: 0.1,
        conflictingEvidenceRate: 0.05,
        seed: options.seed || config.scenarios.seed,
    };
    const scenarioData = await generator.generate(params);
    logger.info(`Generated scenario with ${scenarioData.entities.length} entities and ${scenarioData.relationships.length} relationships`);
    // Load or create workflow
    let workflow;
    if (options.workflow) {
        workflow = loadWorkflowFromFile(options.workflow);
    }
    else {
        workflow = createDefaultWorkflow(scenarioData);
    }
    // Run ghost analyst
    const analyst = new index_js_1.GhostAnalyst(config);
    const session = await analyst.runWorkflow(workflow, scenarioData);
    logger.info(`Session completed: ${session.id}`);
    logger.info(`Tasks completed: ${session.metrics.tasksCompleted}`);
    logger.info(`Tasks failed: ${session.metrics.tasksFailed}`);
    logger.info(`Success rate: ${(session.metrics.successRate * 100).toFixed(2)}%`);
    logger.info(`Duration: ${((session.metrics.duration || 0) / 1000).toFixed(2)}s`);
    logger.info(`Coverage: ${(session.metrics.coverageRate * 100).toFixed(2)}%`);
    // Save metrics
    const metricsCollector = analyst.getMetricsCollector();
    const outputDir = options.output || config.reporting.outputDir;
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const metricsFile = path.join(outputDir, `metrics-${scenarioType}-${Date.now()}.json`);
    fs.writeFileSync(metricsFile, metricsCollector.exportToJSON(), 'utf8');
    logger.info(`Metrics saved to: ${metricsFile}`);
    const csvFile = path.join(outputDir, `metrics-${scenarioType}-${Date.now()}.csv`);
    fs.writeFileSync(csvFile, metricsCollector.exportToCSV(), 'utf8');
    logger.info(`CSV exported to: ${csvFile}`);
}
function loadWorkflowFromFile(filepath) {
    if (!fs.existsSync(filepath)) {
        throw new Error(`Workflow file not found: ${filepath}`);
    }
    const content = fs.readFileSync(filepath, 'utf8');
    const ext = path.extname(filepath).toLowerCase();
    if (ext === '.json') {
        return JSON.parse(content);
    }
    else if (ext === '.yaml' || ext === '.yml') {
        const yaml = require('js-yaml');
        return yaml.load(content);
    }
    else {
        throw new Error(`Unsupported workflow file format: ${ext}`);
    }
}
function createDefaultWorkflow(scenarioData) {
    const steps = [
        {
            type: 'CREATE_INVESTIGATION',
            params: {},
        },
    ];
    // Add entities
    for (let i = 0; i < scenarioData.entities.length; i++) {
        steps.push({
            type: 'ADD_ENTITY',
            params: { entityIndex: i },
        });
    }
    // Add relationships
    for (let i = 0; i < scenarioData.relationships.length; i++) {
        steps.push({
            type: 'ADD_RELATIONSHIP',
            params: { relationshipIndex: i },
        });
    }
    // Query and analyze
    steps.push({
        type: 'QUERY_ENTITIES',
        params: {},
    }, {
        type: 'QUERY_RELATIONSHIPS',
        params: {},
    }, {
        type: 'RUN_COPILOT',
        params: {},
    }, {
        type: 'EXPORT_DATA',
        params: {},
    });
    return {
        name: 'Default Investigation Workflow',
        description: 'Standard workflow for testing investigation features',
        steps,
        strategy: 'systematic',
    };
}
async function generateComparisonReport(options, config) {
    logger.info('Generating comparison report...');
    if (!options.baseline || !options.candidate) {
        throw new Error('Both --baseline and --candidate are required for comparison');
    }
    const outputDir = options.output || config.reporting.outputDir;
    // Load baseline and candidate metrics
    const baselineFile = path.join(outputDir, `metrics-${options.baseline}.json`);
    const candidateFile = path.join(outputDir, `metrics-${options.candidate}.json`);
    if (!fs.existsSync(baselineFile)) {
        throw new Error(`Baseline metrics not found: ${baselineFile}`);
    }
    if (!fs.existsSync(candidateFile)) {
        throw new Error(`Candidate metrics not found: ${candidateFile}`);
    }
    const baselineData = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    const candidateData = JSON.parse(fs.readFileSync(candidateFile, 'utf8'));
    const reporter = new index_js_1.ComparisonReporter();
    const report = reporter.generateComparison({
        version: options.baseline,
        metrics: baselineData.completedSessions || [],
    }, {
        version: options.candidate,
        metrics: candidateData.completedSessions || [],
    });
    // Save report
    const reportPath = await reporter.saveReport(report, outputDir, config.reporting.format);
    logger.info(`Comparison report generated: ${reportPath}`);
    // Print summary
    console.log('\n=== Comparison Summary ===');
    console.log(`Baseline: ${options.baseline}`);
    console.log(`Candidate: ${options.candidate}`);
    console.log(`Success Rate Change: ${(report.comparison.successRateDelta * 100).toFixed(2)}%`);
    console.log(`Performance Change: ${report.comparison.performanceDelta.toFixed(2)}%`);
    console.log(`Quality Change: ${(report.comparison.qualityDelta * 100).toFixed(2)}%`);
    if (report.comparison.regressions.length > 0) {
        console.log('\n⚠️ Regressions Detected:');
        report.comparison.regressions.forEach((r) => console.log(`  - ${r}`));
    }
    if (report.comparison.improvements.length > 0) {
        console.log('\n✅ Improvements:');
        report.comparison.improvements.forEach((i) => console.log(`  - ${i}`));
    }
}
async function runMissionSuite(suiteName, config, options) {
    const runner = new MissionSuiteRunner_js_1.MissionSuiteRunner(config);
    const result = await runner.runSuite(suiteName, {
        outputDir: options.output || config.reporting.outputDir,
        baselineMetricsPath: options.baselineMetrics || options.baseline,
        label: options.candidate || 'candidate',
    });
    console.log(`\n=== Mission Suite: ${suiteName} ===`);
    console.log(`Runs: ${result.runs.length}`);
    console.log(`Average completion: ${(result.aggregated.averageSuccessRate * 100).toFixed(2)}%`);
    console.log(`Average p95 latency: ${(result.aggregated.p95Latency || 0).toFixed(2)}ms`);
    console.log(`Citation correctness: ${(result.aggregated.averageCitationCorrectness || 0).toFixed(2)}`);
    console.log(`False-link rate: ${(result.aggregated.averageFalseLinkRate || 0).toFixed(3)}`);
    console.log(`Leakage incidents: ${(result.aggregated.averageLeakageIncidents || 0).toFixed(0)}`);
    if (result.regressions.length > 0) {
        console.log('\n⚠️ Detected regressions:');
        result.regressions.forEach((issue) => console.log(`  - ${issue}`));
    }
    else {
        console.log('\n✅ No regressions detected');
    }
    if (result.improvements.length > 0) {
        console.log('\n💡 Improvements:');
        result.improvements.forEach((item) => console.log(`  - ${item}`));
    }
    if (result.reportPath) {
        console.log(`\nSuite metrics saved to: ${result.reportPath}`);
    }
}
async function main() {
    const options = parseArgs();
    if (options.help) {
        showHelp();
        process.exit(0);
    }
    if (options.version) {
        showVersion();
        process.exit(0);
    }
    try {
        // Load configuration
        let config;
        if (options.config) {
            config = index_js_1.ConfigLoader.loadFromFile(options.config);
        }
        else {
            config = index_js_1.ConfigLoader.loadFromEnv();
        }
        index_js_1.ConfigLoader.validate(config);
        // Mission suites provide automated regression harnesses
        if (options.missionSuite) {
            await runMissionSuite(options.missionSuite, config, options);
            return;
        }
        // Handle comparison report
        if (options.report && options.baseline && options.candidate) {
            await generateComparisonReport(options, config);
            return;
        }
        // Handle scenario execution
        if (!options.scenario) {
            throw new Error('--scenario is required. Use --help for usage information.');
        }
        if (options.scenario === 'all') {
            const scenarios = [
                'fraud-ring',
                'terror-cell',
                'corruption-network',
                'supply-chain',
                'money-laundering',
            ];
            for (const scenario of scenarios) {
                await runScenario(scenario, config, options);
            }
        }
        else {
            await runScenario(options.scenario, config, options);
        }
        logger.info('Simulation harness completed successfully');
        process.exit(0);
    }
    catch (error) {
        logger.error('Simulation harness failed:', error);
        console.error(error.message);
        process.exit(1);
    }
}
// Run CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
