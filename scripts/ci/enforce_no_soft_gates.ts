import fs from 'node:fs';
import path from 'node:path';
import { loadFlakeRegistry, getFlakeById } from './lib/flake-registry';

const WORKFLOW_DIR = path.join('.github', 'workflows');
const WORKFLOW_EXTENSIONS = ['.yml', '.yaml'];

type ContinueOnErrorRecord = {
  workflowFile: string;
  jobId: string | null;
  stepName: string | null;
  lineNumber: number;
  flakeId: string | null;
};

function listWorkflowFiles(): string[] {
  const results: string[] = [];
  const queue = [WORKFLOW_DIR];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (WORKFLOW_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    });
  }

  return results;
}

function parseFlakeId(line: string): string | null {
  const match = line.match(/flake-id:\s*([a-z0-9-]+)/i);
  return match ? match[1] : null;
}

function parseWorkflowFile(filePath: string): ContinueOnErrorRecord[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const records: ContinueOnErrorRecord[] = [];
  let inJobs = false;
  let currentJobId: string | null = null;
  let currentStepName: string | null = null;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      currentJobId = null;
      currentStepName = null;
      return;
    }

    if (inJobs) {
      const jobMatch = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*$/);
      if (jobMatch) {
        currentJobId = jobMatch[1];
        currentStepName = null;
        return;
      }

      const stepMatch = line.match(/^\s{4,}-\s+name:\s*(.+)$/);
      if (stepMatch) {
        currentStepName = stepMatch[1].trim();
      }

      if (line.includes('continue-on-error:') && line.includes('true')) {
        const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
        const isStepLevel = indent >= 6;
        records.push({
          workflowFile: filePath,
          jobId: currentJobId,
          stepName: isStepLevel ? currentStepName : null,
          lineNumber,
          flakeId: parseFlakeId(line),
        });
      }
    }
  });

  return records;
}

function buildTarget(record: ContinueOnErrorRecord): string {
  const workflowName = path.basename(record.workflowFile);
  if (record.jobId && record.stepName) {
    return `workflow:${workflowName}#${record.jobId}/${record.stepName}`;
  }
  if (record.jobId) {
    return `workflow:${workflowName}#${record.jobId}`;
  }
  return `workflow:${workflowName}`;
}

function main(): void {
  const registry = loadFlakeRegistry();
  const workflowFiles = listWorkflowFiles();
  const errors: string[] = [];

  workflowFiles.forEach((file) => {
    const records = parseWorkflowFile(file);
    records.forEach((record) => {
      if (!record.flakeId) {
        errors.push(`${record.workflowFile}:${record.lineNumber} continue-on-error requires inline "# flake-id: <id>" comment.`);
        return;
      }
      const entry = getFlakeById(registry, record.flakeId);
      if (!entry) {
        errors.push(`${record.workflowFile}:${record.lineNumber} flake-id ${record.flakeId} not found in registry.`);
        return;
      }
      if (entry.scope !== 'workflow-job') {
        errors.push(`${record.workflowFile}:${record.lineNumber} flake-id ${record.flakeId} must use scope workflow-job.`);
      }
      const expectedTarget = buildTarget(record);
      if (entry.target !== expectedTarget && entry.target !== `workflow:${path.basename(record.workflowFile)}#${record.jobId}`) {
        errors.push(`${record.workflowFile}:${record.lineNumber} flake-id ${record.flakeId} target mismatch (expected ${expectedTarget}).`);
      }
    });
  });

  if (errors.length > 0) {
    const message = errors.map((err) => `- ${err}`).join('\n');
    throw new Error(`Soft-gate enforcement failed:\n${message}`);
  }

  // eslint-disable-next-line no-console
  console.log('Soft-gate enforcement passed.');
}

main();
