import fs from 'fs';
import path from 'path';
import { RuntimeResult } from './runtime';
import { SwarmPlan } from './planner';
export function emitEvidence(runId: string, plan: SwarmPlan, result: RuntimeResult, baseDir: string = 'evidence/runs'): string {
  const runDir = path.join(baseDir, runId);
  if (!fs.existsSync(runDir)) { fs.mkdirSync(runDir, { recursive: true }); }
  const reportPath = path.join(runDir, 'report.json');
  const metricsPath = path.join(runDir, 'metrics.json');
  const stampPath = path.join(runDir, 'stamp.json');
  const report = { run_id: runId, mode: "swarm", summary: "Swarm execution completed", evidence_ids: [`EVD-KIMIK25-SWARM-RUN-${runId}`], outputs: result.outputs };
  const metrics = { run_id: runId, metrics: result.usage };
  const stamp = { run_id: runId, generated_at: new Date().toISOString() };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
  fs.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
  updateIndex(`EVD-KIMIK25-SWARM-RUN-${runId}`, [reportPath, metricsPath, stampPath]);
  return runDir;
}
function updateIndex(evidenceId: string, files: string[]) {
  const indexPath = path.join(process.cwd(), 'evidence/index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    index.items[evidenceId] = { files: files, title: `Swarm Run ${evidenceId.slice(-8)}`, category: "runtime" };
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }
}
