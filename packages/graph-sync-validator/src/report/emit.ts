import { DriftReport, DriftFinding } from '../types.js';
import { createHash } from 'crypto';

export function createReport(
  runId: string,
  findings: DriftFinding[],
  autofixPlan: { cypher: string[]; sql: string[] },
  metrics: DriftReport['metrics']
): DriftReport {
  // Sort findings for determinism
  const sortedFindings = [...findings].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    // Type narrowing
    const idA = 'id' in a ? a.id : (a as any).fromId;
    const idB = 'id' in b ? b.id : (b as any).fromId;
    if (idA !== idB) return idA.localeCompare(idB);

    if (a.kind === 'PROP_MISMATCH' && b.kind === 'PROP_MISMATCH') {
        return a.prop.localeCompare(b.prop);
    }
    return 0;
  });

  const totals = findings.reduce((acc, f) => {
        acc[f.kind] = (acc[f.kind] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

  const baseReport: DriftReport = {
    runId,
    selectorsVersion: 'v1',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    totals,
    findings: sortedFindings,
    autofixPlan,
    metrics,
    deterministicHash: ''
  };

  // Compute hash on stable content (excluding transient fields like runId, timestamps, duration)
  const contentToHash = {
    selectorsVersion: baseReport.selectorsVersion,
    findings: baseReport.findings,
    autofixPlan: baseReport.autofixPlan,
    metrics: {
        scannedRows: metrics.scannedRows,
        scannedNodes: metrics.scannedNodes,
        scannedRels: metrics.scannedRels
        // exclude durationMs
    }
  };

  const json = JSON.stringify(contentToHash);
  baseReport.deterministicHash = createHash('sha256').update(json).digest('hex');

  return baseReport;
}
