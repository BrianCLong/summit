import * as fs from 'fs/promises';
import * as path from 'path';

export function buildEvidencePrefix(goalId: string): string {
  return `SUMMIT-MAR-${goalId}`;
}

export function buildStamp(planHash: string, configHash: string) {
  return { planHash, configHash, deterministic: true };
}

export async function writeArtifacts(goalId: string, artifacts: { plan: any, report: any, metrics: any, stamp: any }) {
  const dir = path.join('artifacts', 'multi-agent-runtime', goalId);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(path.join(dir, 'plan.json'), JSON.stringify(artifacts.plan, null, 2));
  await fs.writeFile(path.join(dir, 'report.json'), JSON.stringify(artifacts.report, null, 2));
  await fs.writeFile(path.join(dir, 'metrics.json'), JSON.stringify(artifacts.metrics, null, 2));
  await fs.writeFile(path.join(dir, 'stamp.json'), JSON.stringify(artifacts.stamp, null, 2));
}
