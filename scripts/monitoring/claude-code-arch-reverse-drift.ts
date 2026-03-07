import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateFlows } from '../../src/flows/generate';

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function main(): void {
  const workspace = process.cwd();
  const canonicalDir = path.join(workspace, 'docs/architecture/flows');
  const tempDir = path.join(workspace, '.tmp/flows-drift');

  fs.rmSync(tempDir, { recursive: true, force: true });
  generateFlows({ workspace, out: tempDir });

  const canonicalFlowPath = path.join(canonicalDir, 'flows.json');
  const tempFlowPath = path.join(tempDir, 'flows.json');

  const canonicalHash = fs.existsSync(canonicalFlowPath) ? hashFile(canonicalFlowPath) : 'missing';
  const generatedHash = hashFile(tempFlowPath);

  const report = {
    version: 'v1',
    canonicalHash,
    generatedHash,
    driftDetected: canonicalHash !== generatedHash,
  };

  const reportPath = path.join(workspace, 'artifacts/flows/drift_report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.driftDetected) {
    console.error('Flow drift detected. Regenerate docs/architecture/flows artifacts.');
    process.exit(1);
  }

  console.log('Flow drift check passed.');
}

main();
