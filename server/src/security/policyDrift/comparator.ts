import { DriftDiff, PolicyDriftReport } from './types.js';

function classifyDiff(path: string, before: any, after: any): DriftDiff {
  let classification: DriftDiff['classification'] = 'benign';
  let rationale = 'change detected';

  if (path.includes('toolAllowlist') && Array.isArray(after) && Array.isArray(before)) {
    classification = after.length > before.length ? 'risky' : 'benign';
    rationale = after.length > before.length ? 'allowlist expanded' : 'allowlist reduced';
  } else if (path.includes('toolDenylist') && Array.isArray(after) && Array.isArray(before)) {
    classification = after.length < before.length ? 'risky' : 'benign';
    rationale = after.length < before.length ? 'denylist reduced' : 'denylist expanded';
  } else if (path.includes('budgets')) {
    classification = Number(after) > Number(before) ? 'risky' : 'benign';
    rationale = 'budget change';
  } else if (path.includes('strictAttribution')) {
    classification = after === false ? 'critical' : 'benign';
    rationale = after === false ? 'strict attribution disabled' : 'strict attribution enabled';
  } else if (path.includes('approvalRequirements')) {
    classification = Array.isArray(before) && before.length > (after?.length || 0) ? 'critical' : 'risky';
    rationale = 'approval requirements changed';
  } else if (path.includes('riskWeights')) {
    classification = Number(after) < Number(before) ? 'risky' : 'benign';
    rationale = 'risk weight adjusted';
  } else if (path.includes('redaction')) {
    classification = after?.enabled === false ? 'critical' : 'benign';
    rationale = after?.enabled === false ? 'redaction disabled' : 'redaction updated';
  }

  return { path, before, after, classification, rationale };
}

export function compareSnapshots(baseline: any, runtime: any): PolicyDriftReport {
  const diffs: DriftDiff[] = [];

  const keysToCheck: Array<keyof typeof baseline.normalized> = [
    'toolAllowlist',
    'toolDenylist',
    'budgets',
    'strictAttribution',
    'approvalRequirements',
    'riskWeights',
    'redaction',
  ];

  for (const key of keysToCheck) {
    const baseVal = baseline.normalized[key];
    const runtimeVal = runtime.normalized[key];

    if (JSON.stringify(baseVal) !== JSON.stringify(runtimeVal)) {
      if (typeof baseVal === 'object' && typeof runtimeVal === 'object') {
        const allSubKeys = new Set([
          ...Object.keys(baseVal || {}),
          ...Object.keys(runtimeVal || {}),
        ]);
        allSubKeys.forEach((subKey) => {
          const before = (baseVal as any)?.[subKey];
          const after = (runtimeVal as any)?.[subKey];
          if (JSON.stringify(before) !== JSON.stringify(after)) {
            diffs.push(classifyDiff(`${String(key)}.${String(subKey)}`, before, after));
          }
        });
      } else {
        diffs.push(classifyDiff(String(key), baseVal, runtimeVal));
      }
    }
  }

  let severity: PolicyDriftReport['severity'] = 'none';
  if (diffs.some((d) => d.classification === 'critical')) {
    severity = 'critical';
  } else if (diffs.some((d) => d.classification === 'risky')) {
    severity = 'high';
  } else if (diffs.length > 0) {
    severity = 'low';
  }

  return {
    baselineSnapshotId: baseline.snapshotId,
    runtimeSnapshotId: runtime.snapshotId,
    severity,
    confidence: 'high',
    diffs,
    evidenceRefs: [baseline.snapshotId, runtime.snapshotId],
  };
}
