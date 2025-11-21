/**
 * Simulation Runner
 *
 * Orchestrates full attack simulation and generates reports.
 */

import { createDetectionEngine } from '../detections/engine.js';
import { allRules } from '../detections/rules/index.js';
import { createAnomalyDetector } from '../detections/anomaly.js';
import { generateCampaign, campaignTemplates } from '../generators/campaign.js';
import { generateNetworkBatch } from '../generators/network.js';
import { generateIdentityBatch } from '../generators/identity.js';
import { generateEndpointBatch } from '../generators/endpoint.js';
import { generateCloudBatch } from '../generators/cloud.js';
import { SeededRandom } from '../generators/utils.js';
import { createSampleInfrastructure, InfrastructureGraph } from './graph.js';
import { securityControls, evaluateCampaignControls } from './controls.js';
import type { Campaign } from '../generators/campaign.js';
import type { DetectionResult } from '../schemas/base.js';

/** Simulation configuration */
export interface SimulationConfig {
  /** Random seed for reproducibility */
  seed?: number;
  /** Number of background events to generate */
  backgroundEventCount?: number;
  /** Campaign template to use */
  campaignTemplate?: string;
  /** Tenant ID for events */
  tenantId?: string;
}

/** Simulation results */
export interface SimulationResults {
  campaign: Campaign;
  infrastructure: {
    nodeCount: number;
    edgeCount: number;
    compromisedCount: number;
  };
  detection: {
    totalEvents: number;
    eventsWithDetections: number;
    totalDetections: number;
    detectionsBySeverity: Record<string, number>;
    detectionsByRule: Record<string, number>;
  };
  controlSimulation: {
    techniquesEvaluated: number;
    blocked: boolean;
    detected: boolean;
    avgResidualRisk: number;
  };
  anomalies: {
    count: number;
    metrics: string[];
  };
  summary: string;
}

/** Run a full simulation */
export async function runSimulation(
  config: SimulationConfig = {}
): Promise<SimulationResults> {
  const rng = new SeededRandom(config.seed ?? Date.now());
  const tenantId = config.tenantId ?? 'sim-tenant-001';

  console.log('=== SIGINT Telemetry Simulation ===\n');
  console.log('DISCLAIMER: This is a SIMULATION using SYNTHETIC data only.\n');

  // 1. Create infrastructure graph
  console.log('1. Creating synthetic infrastructure...');
  const infrastructure = createSampleInfrastructure();

  // 2. Generate campaign
  console.log('2. Generating attack campaign...');
  const templateName = config.campaignTemplate ?? campaignTemplates[0].name;
  const template = campaignTemplates.find((t) => t.name === templateName) ?? campaignTemplates[0];
  const campaign = generateCampaign(template, { rng, tenantId });

  // 3. Generate background events
  console.log('3. Generating background telemetry...');
  const bgCount = config.backgroundEventCount ?? 100;
  const backgroundEvents = [
    ...generateNetworkBatch(bgCount, { rng, tenantId }),
    ...generateIdentityBatch(Math.floor(bgCount / 2), { rng, tenantId }),
    ...generateEndpointBatch(Math.floor(bgCount / 2), { rng, tenantId }),
    ...generateCloudBatch(Math.floor(bgCount / 4), { rng, tenantId }),
  ];

  // 4. Extract campaign events
  const campaignEvents = campaign.steps.flatMap((s) => s.events);
  const allEvents = [...backgroundEvents, ...campaignEvents];

  // 5. Run detection engine
  console.log('4. Running detection engine...');
  const engine = createDetectionEngine();
  engine.registerRules(allRules);
  const detectionResults = engine.evaluateBatch(allEvents);
  const detectionStats = engine.getStats(detectionResults);
  detectionStats.totalEvents = allEvents.length;

  // 6. Run anomaly detection
  console.log('5. Running anomaly detection...');
  const anomalyDetector = createAnomalyDetector({ minSamples: 10 });
  const anomalies: string[] = [];
  for (const event of allEvents) {
    const eventAnomalies = anomalyDetector.processEvent(event);
    for (const a of eventAnomalies) {
      anomalies.push(a.metricName);
    }
  }

  // 7. Simulate controls
  console.log('6. Simulating security controls...');
  const techniques = campaign.steps.map((s) => s.technique.split(' - ')[0]);
  const controlResults = evaluateCampaignControls(techniques, securityControls);

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

  console.log('\n' + summary);

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
function generateSummary(data: {
  campaign: Campaign;
  detectionStats: {
    totalEvents: number;
    eventsWithDetections: number;
    totalDetections: number;
    bySeverity: Record<string, number>;
    byRule: Record<string, number>;
  };
  controlResults: ReturnType<typeof evaluateCampaignControls>;
  anomalyCount: number;
  infraStats: {
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<string, number>;
    compromisedCount: number;
  };
}): string {
  const lines: string[] = [
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
