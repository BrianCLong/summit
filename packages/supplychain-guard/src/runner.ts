import { writeEvidence } from './evidence.js';
import { EvidenceReport, EvidenceMetrics, EvidenceStamp } from './schema.js';

export async function runGate(
  gateName: string,
  gateFn: () => Promise<{ ok: boolean; findings: any[] }>,
  baseDir: string = 'artifacts/supplychain'
) {
  const start = Date.now();
  const stamp: EvidenceStamp = {
    evidence_id: `EVID:SUPPLYCHAIN:${gateName}:v1`,
    created_at: new Date().toISOString(),
  };

  console.log(`Running gate: ${gateName}...`);

  try {
    const result = await gateFn();
    const duration = Date.now() - start;

    const report: EvidenceReport = {
      evidence_id: stamp.evidence_id,
      gate: gateName,
      ok: result.ok,
      findings: result.findings
    };

    const metrics: EvidenceMetrics = {
      evidence_id: stamp.evidence_id,
      durations_ms: { [gateName]: duration },
      counters: { findings: result.findings.length }
    };

    writeEvidence(baseDir, gateName, report, metrics, stamp);

    if (!result.ok) {
        console.error(`Gate ${gateName} failed with ${result.findings.length} findings.`);
        // We exit 1 to fail CI, but only after writing evidence
        process.exit(1);
    }
    console.log(`Gate ${gateName} passed.`);

  } catch (error) {
    console.error(`Gate ${gateName} crashed:`, error);
    process.exit(1);
  }
}
