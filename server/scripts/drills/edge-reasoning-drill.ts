
import { edgeReasoningService } from '../../src/services/EdgeReasoningService.js';
import { logger } from '../../src/config/logger.js';

/**
 * Task #115: Edge-Scale Reasoning Drill.
 * Validates sub-second inference offloading to regional edge nodes.
 */
async function runEdgeReasoningDrill() {
  logger.info('🚀 Starting Edge-Scale Reasoning Drill');

  const modelId = 'gnn-threat-detector-v4';
  const region = 'eu-west-1';
  const graphSnippet = {
    nodes: [{ id: 'srv-01', type: 'Server' }, { id: 'usr-admin', type: 'User' }],
    edges: [{ source: 'usr-admin', target: 'srv-01', type: 'LOGIN' }]
  };

  console.log('--- Step 1: Syncing Model to Edge Mesh ---');
  await edgeReasoningService.syncModelsToEdge(modelId);

  console.log('--- Step 2: Performing Local Inference ---');
  const startTime = Date.now();
  const result = await edgeReasoningService.performInference({
    modelId,
    graphSnippet,
    priority: 'real-time'
  }, region);

  const duration = Date.now() - startTime;
  console.log(`Inference Result (from ${result.nodeId}):`, result.prediction);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Execution Duration: ${duration}ms`);

  if (result.prediction === 'ANOMALY_DETECTED' && duration < 100) {
    logger.info('✅ Edge-Scale Reasoning Operational (Low-Latency)');
    process.exit(0);
  } else {
    logger.error('❌ Edge-Scale Reasoning Failed latency or prediction check');
    process.exit(1);
  }
}

runEdgeReasoningDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});
