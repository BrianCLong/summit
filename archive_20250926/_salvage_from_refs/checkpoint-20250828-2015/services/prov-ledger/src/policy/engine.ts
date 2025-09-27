import type { Evidence } from '../storage/neo4j.js';

export type Deny = { reason: string; appealUrl?: string; evidenceId?: string };

export async function evaluateExport(evidence: Evidence[]): Promise<Deny[]> {
  const denies: Deny[] = [];
  const appealUrl = process.env.POLICY_APPEAL_URL || 'https://appeals.example/policy';
  // Simple license conflict example: block AGPL artifacts
  for (const e of evidence) {
    if ((e.license || '').toUpperCase().includes('AGPL')) {
      denies.push({ reason: 'LICENSE_CONFLICT', appealUrl, evidenceId: e.id });
    }
    if (e.labels?.sensitivity === 'restricted') {
      denies.push({ reason: 'SENSITIVITY_RESTRICTED', appealUrl, evidenceId: e.id });
    }
  }
  return denies;
}
