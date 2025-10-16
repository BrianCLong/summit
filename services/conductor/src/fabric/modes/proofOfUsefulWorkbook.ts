import { createHash } from 'crypto';

export interface WorkbookStep {
  name: string;
  command: string;
  expectedEvidence: string;
}

export interface WorkbookReceipt {
  step: string;
  status: 'pass' | 'fail';
  timestamp: string;
}

export interface WorkbookBundle {
  workbook: { steps: WorkbookStep[] };
  receipts: WorkbookReceipt[];
  digest: string;
}

export function issueProofOfUsefulWorkbook(
  specId: string,
  steps: WorkbookStep[],
  runs: (step: WorkbookStep) => 'pass' | 'fail',
): WorkbookBundle {
  const receipts: WorkbookReceipt[] = steps.map((step) => ({
    step: step.name,
    status: runs(step),
    timestamp: new Date().toISOString(),
  }));
  const digest = createHash('sha256')
    .update(specId + JSON.stringify(steps) + JSON.stringify(receipts))
    .digest('hex');
  return {
    workbook: { steps },
    receipts,
    digest: `sha256:${digest}`,
  };
}
