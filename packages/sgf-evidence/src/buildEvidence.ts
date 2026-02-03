import { canonicalJson, sha256Bytes } from './hash.js';

export interface EvidenceBundle {
  report: any;
  metrics: any;
  stamp: any;
}

export function buildEvidenceBundle(
  packName: string,
  runId: string,
  data: any
): EvidenceBundle {
  const report = {
    packName,
    runId,
    timestamp: new Date().toISOString(),
    data
  };

  const reportBuf = canonicalJson(report);
  const reportHash = sha256Bytes(reportBuf);

  const stamp = {
    evidence_id: `EVID-${new Date().toISOString().split('T')[0]}-${packName}-${runId}`,
    schema_version: "1.0.0",
    report_hash: reportHash
  };

  return {
    report,
    metrics: {},
    stamp
  };
}
