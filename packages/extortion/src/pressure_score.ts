import { LeakSiteRecord, ExposureFinding, ExtortionNoteAnalysis, PressureScore } from './schema';

export function calculatePressureScore(
  leakRecords: LeakSiteRecord[],
  findings: ExposureFinding[],
  noteAnalysis: ExtortionNoteAnalysis | null
): PressureScore {
  const vectors = {
    legal_regulatory: 0,
    reputation: 0,
    operational: 0,
    coercion: 0,
  };

  const explain: Record<string, string> = {};

  // Legal/Regulatory
  const hasPII = findings.some(f => f.description.toLowerCase().includes('pii') || f.description.toLowerCase().includes('patient'));
  const hasHealthcare = leakRecords.some(r => r.sector === 'Healthcare');
  vectors.legal_regulatory = Math.min(10, (hasPII ? 5 : 0) + (hasHealthcare ? 5 : 0) + (noteAnalysis?.tactics.includes('LEGAL_LIABILITY_FRAMING') ? 2 : 0));
  explain.legal_regulatory = `Based on ${findings.length} findings and ${leakRecords.length} leak records. PII exposure: ${hasPII}.`;

  // Reputation
  vectors.reputation = Math.min(10, leakRecords.length * 2 + (noteAnalysis?.tactics.includes('PUBLIC_SHAMING') ? 4 : 0));
  explain.reputation = `Derived from ${leakRecords.length} leak site records and note tactics.`;

  // Operational
  const criticalFindings = findings.filter(f => f.severity === 'CRITICAL').length;
  vectors.operational = Math.min(10, criticalFindings * 3 + (noteAnalysis?.tactics.includes('DOWNTIME_EMPHASIS') ? 3 : 0));
  explain.operational = `Identified ${criticalFindings} critical exposure findings.`;

  // Coercion
  let coercionScore = 0;
  if (noteAnalysis) {
    if (noteAnalysis.tactics.includes('SURVEILLANCE_CLAIM')) coercionScore += 5;
    if (noteAnalysis.tactics.includes('TIME_PRESSURE')) coercionScore += 5;
  }
  vectors.coercion = Math.min(10, coercionScore);
  explain.coercion = `Intensity based on psychological tactics found in ransom note.`;

  const overall_score = Math.round(
    (vectors.legal_regulatory * 0.3 +
      vectors.reputation * 0.3 +
      vectors.operational * 0.2 +
      vectors.coercion * 0.2) * 10
  );

  return {
    overall_score,
    vectors,
    explain,
  };
}
