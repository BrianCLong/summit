import { StackRun } from './orchestrator.js';

export async function writeDeterministicArtifacts(run: StackRun): Promise<void> {
  // Mock writing to artifact directory
  // In a real implementation this writes report.json, metrics.json, stamp.json, evidence.json
  console.log(`Writing artifacts for run ${run.runId}`);
}
