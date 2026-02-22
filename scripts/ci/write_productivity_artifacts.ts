import path from 'node:path';
import { writeProductivityArtifacts, ProductivityMetrics, RunStamp } from '../../src/productivity/artifact_writer';
import { collectAllMetrics } from '../../src/productivity/run_metrics';

const metricsData = collectAllMetrics();

const metrics: ProductivityMetrics = {
  mode: (process.env.ASSIST_MODE as 'baseline' | 'assist') || 'baseline',
  metrics: metricsData,
  tags: (process.env.PR_TAGS || '').split(',').filter(Boolean)
};

const stamp: RunStamp = {
  runId: process.env.GITHUB_RUN_ID || 'local-run',
  timestamp: new Date().toISOString(),
  workflowId: process.env.GITHUB_WORKFLOW || 'unknown',
  runner: process.env.RUNNER_NAME || 'local'
};

const outputDir = process.env.ARTIFACT_DIR || 'artifacts/productivity';

try {
  writeProductivityArtifacts(outputDir, metrics, stamp);
} catch (error) {
  console.error('Failed to write productivity artifacts:', error);
  process.exit(1);
}
