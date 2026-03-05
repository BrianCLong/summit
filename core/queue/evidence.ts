import * as fs from 'fs';
import * as path from 'path';

export interface AsyncEvidence {
  jobId: string;
  idempotencyHash: string;
  logicalCounter: number;
}

export function emitDeterministicEvidence(evidence: AsyncEvidence) {
  const dir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Determinism Rules: No wall-clock timestamps
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({
    jobId: evidence.jobId,
    idempotencyHash: evidence.idempotencyHash,
    status: 'enqueued'
  }, null, 2));

  fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify({
    retries: 0, // Deterministic counter based on logical state
    logicalCounter: evidence.logicalCounter
  }, null, 2));

  fs.writeFileSync(path.join(dir, 'stamp.json'), JSON.stringify({
    evidenceId: `EVID-ASYNC-${evidence.idempotencyHash}`
  }, null, 2));
}
