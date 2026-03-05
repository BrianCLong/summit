import * as fs from 'fs';
import * as path from 'path';

export type EvidenceResult = "pass" | "fail";

export interface EvidenceReport {
  evidence_id: string;
  result: EvidenceResult;
  violations: Array<{ code: string; message: string; path?: string }>;
}

export interface EvidenceMetrics {
  counters: Record<string, number>;
}

// NOTE: timestamps allowed only in stamp.json
export interface EvidenceStamp {
  generated_at: string;
}

export function emitEvidence(area: string, evidenceId: string, result: EvidenceResult, violations: any[] = [], counters: Record<string, number> = {}): void {
  const baseDir = path.join(process.cwd(), 'evidence', area);

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const report: EvidenceReport = {
    evidence_id: evidenceId,
    result,
    violations
  };
  fs.writeFileSync(path.join(baseDir, 'report.json'), JSON.stringify(report, null, 2));

  const metrics: EvidenceMetrics = {
    counters
  };
  fs.writeFileSync(path.join(baseDir, 'metrics.json'), JSON.stringify(metrics, null, 2));

  const stamp: EvidenceStamp = {
    generated_at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(baseDir, 'stamp.json'), JSON.stringify(stamp, null, 2));
}
