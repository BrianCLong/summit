import { CompanyOSDecisionEvidence } from '../../../../packages/evidence-contracts/src/companyosDecisionEvidence.js';

export async function emitEvidenceToIntelGraph(evidence: CompanyOSDecisionEvidence): Promise<void> {
  const intelGraphUrl = process.env.INTELGRAPH_URL || 'http://localhost:4000';

  try {
    await fetch(`${intelGraphUrl}/api/v1/ingest/companyos-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evidence),
    });
  } catch (error) {
    console.warn('Failed to emit evidence to IntelGraph:', error instanceof Error ? error.message : error);
    // Non-blocking in MWS
  }
}
