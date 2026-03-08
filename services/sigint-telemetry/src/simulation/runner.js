"use strict";
/**
 * Simulation Runner
 *
 * Orchestrates full attack simulation and generates reports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSimulation = runSimulation;
const engine_js_1 = require("../detections/engine.js");
const index_js_1 = require("../detections/rules/index.js");
const anomaly_js_1 = require("../detections/anomaly.js");
const campaign_js_1 = require("../generators/campaign.js");
const network_js_1 = require("../generators/network.js");
const identity_js_1 = require("../generators/identity.js");
const endpoint_js_1 = require("../generators/endpoint.js");
const cloud_js_1 = require("../generators/cloud.js");
const utils_js_1 = require("../generators/utils.js");
const graph_js_1 = require("./graph.js");
const controls_js_1 = require("./controls.js");
/** Run a full simulation */
async function runSimulation(config = {}) {
    const rng = new utils_js_1.SeededRandom(config.seed ?? Date.now());
    const tenantId = config.tenantId ?? 'sim-tenant-001';
    console.log('=== SIGINT Telemetry Simulation ===\n');
    console.log('DISCLAIMER: This is a SIMULATION using SYNTHETIC data only.\n');
    // 1. Create infrastructure graph
    console.log('1. Creating synthetic infrastructure...');
    const infrastructure = (0, graph_js_1.createSampleInfrastructure)();
    // 2. Generate campaign
    console.log('2. Generating attack campaign...');
    const templateName = config.campaignTemplate ?? campaign_js_1.campaignTemplates[0].name;
    const template = campaign_js_1.campaignTemplates.find((t) => t.name === templateName) ?? campaign_js_1.campaignTemplates[0];
    const campaign = (0, campaign_js_1.generateCampaign)(template, { rng, tenantId });
    // 3. Generate background events
    console.log('3. Generating background telemetry...');
    const bgCount = config.backgroundEventCount ?? 100;
    const backgroundEvents = [
        ...(0, network_js_1.generateNetworkBatch)(bgCount, { rng, tenantId }),
        ...(0, identity_js_1.generateIdentityBatch)(Math.floor(bgCount / 2), { rng, tenantId }),
        ...(0, endpoint_js_1.generateEndpointBatch)(Math.floor(bgCount / 2), { rng, tenantId }),
        ...(0, cloud_js_1.generateCloudBatch)(Math.floor(bgCount / 4), { rng, tenantId }),
    ];
    // 4. Extract campaign events
    const campaignEvents = campaign.steps.flatMap((s) => s.events);
    const allEvents = [...backgroundEvents, ...campaignEvents];
    // 5. Run detection engine
    console.log('4. Running detection engine...');
    const engine = (0, engine_js_1.createDetectionEngine)();
    engine.registerRules(index_js_1.allRules);
    const detectionResults = engine.evaluateBatch(allEvents);
    const detectionStats = engine.getStats(detectionResults);
    detectionStats.totalEvents = allEvents.length;
    // 6. Run anomaly detection
    console.log('5. Running anomaly detection...');
    const anomalyDetector = (0, anomaly_js_1.createAnomalyDetector)({ minSamples: 10 });
    const anomalies = [];
    for (const event of allEvents) {
        const eventAnomalies = anomalyDetector.processEvent(event);
        for (const a of eventAnomalies) {
            anomalies.push(a.metricName);
        }
    }
    // 7. Simulate controls
    console.log('6. Simulating security controls...');
    const techniques = campaign.steps.map((s) => s.technique.split(' - ')[0]);
    const controlResults = (0, controls_js_1.evaluateCampaignControls)(techniques, controls_js_1.securityControls);
    // 8. Simulate compromise
    console.log('7. Simulating attack path...');
    const nodes = infrastructure.getNodes();
    if (nodes.length > 0 && !controlResults.overallBlocked) {
        // Compromise initial node if not blocked
        infrastructure.compromiseNode(nodes[0].id);
    }
    const infraStats = infrastructure.getStats();
    // 9. Generate summary
    const summary = generateSummary({
        campaign,
        detectionStats,
        controlResults,
        anomalyCount: anomalies.length,
        infraStats,
    });
    console.log(`\n${summary}`);
    return {
        campaign,
        infrastructure: {
            nodeCount: infraStats.nodeCount,
            edgeCount: infraStats.edgeCount,
            compromisedCount: infraStats.compromisedCount,
        },
        detection: {
            totalEvents: allEvents.length,
            eventsWithDetections: detectionStats.eventsWithDetections,
            totalDetections: detectionStats.totalDetections,
            detectionsBySeverity: detectionStats.bySeverity,
            detectionsByRule: detectionStats.byRule,
        },
        controlSimulation: {
            techniquesEvaluated: techniques.length,
            blocked: controlResults.overallBlocked,
            detected: controlResults.overallDetected,
            avgResidualRisk: controlResults.avgResidualRisk,
        },
        anomalies: {
            count: anomalies.length,
            metrics: [...new Set(anomalies)],
        },
        summary,
    };
}
/** Generate human-readable summary */
function generateSummary(data) {
    const lines = [
        '=== SIMULATION RESULTS ===',
        '',
        `Campaign: ${data.campaign.name}`,
        `Steps: ${data.campaign.steps.length}`,
        `Duration: ${data.campaign.startTime} to ${data.campaign.endTime}`,
        '',
        '--- Detection Summary ---',
        `Total Events: ${data.detectionStats.totalEvents}`,
        `Events with Detections: ${data.detectionStats.eventsWithDetections}`,
        `Total Detections: ${data.detectionStats.totalDetections}`,
        `  Critical: ${data.detectionStats.bySeverity.critical}`,
        `  High: ${data.detectionStats.bySeverity.high}`,
        `  Medium: ${data.detectionStats.bySeverity.medium}`,
        `  Low: ${data.detectionStats.bySeverity.low}`,
        '',
        '--- Control Simulation ---',
        `Techniques Evaluated: ${data.controlResults.results.length}`,
        `Attack Blocked: ${data.controlResults.overallBlocked ? 'YES' : 'NO'}`,
        `Attack Detected: ${data.controlResults.overallDetected ? 'YES' : 'NO'}`,
        `Avg Residual Risk: ${(data.controlResults.avgResidualRisk * 100).toFixed(1)}%`,
        '',
        '--- Anomaly Detection ---',
        `Anomalies Found: ${data.anomalyCount}`,
        '',
        '--- Infrastructure ---',
        `Nodes: ${data.infraStats.nodeCount}`,
        `Edges: ${data.infraStats.edgeCount}`,
        `Compromised: ${data.infraStats.compromisedCount}`,
        '',
        '=== END SIMULATION ===',
    ];
    return lines.join('\n');
}
// CLI entry point
if (process.argv[1]?.includes('runner')) {
    runSimulation({ seed: 42, backgroundEventCount: 200 })
        .then((results) => {
        console.log('\nSimulation complete.');
        console.log(`Results: ${results.detection.totalDetections} detections from ${results.detection.totalEvents} events`);
    })
        .catch(console.error);
}
