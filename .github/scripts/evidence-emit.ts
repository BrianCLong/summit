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

export function emitEvidence(
  category: "infra" | "policy" | "scaffolder",
  evidenceId: string,
  result: EvidenceResult,
  violations: Array<{ code: string; message: string; path?: string }> = [],
  counters: Record<string, number> = {}
): void {
  const baseDir = path.join(process.cwd(), 'evidence', category);
  fs.mkdirSync(baseDir, { recursive: true });

  const report: EvidenceReport = {
    evidence_id: evidenceId,
    result,
    violations,
  };

  const metrics: EvidenceMetrics = {
    counters,
  };

  const stamp: EvidenceStamp = {
    generated_at: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(baseDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(baseDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(baseDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

  // Update index.json
  const indexFile = path.join(process.cwd(), 'evidence', 'index.json');
  let indexData: any = { version: 1, evidence: {} };
  if (fs.existsSync(indexFile)) {
    try {
      indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      if (!indexData.evidence) indexData.evidence = {};
    } catch (e) {
      // Ignore
    }
  }

  indexData.evidence[evidenceId] = {
    evidence_id: evidenceId,
    files: {
      report: `evidence/${category}/report.json`,
      metrics: `evidence/${category}/metrics.json`,
      stamp: `evidence/${category}/stamp.json`
    }
  };

  fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
}
