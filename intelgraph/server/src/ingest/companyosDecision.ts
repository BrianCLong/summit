import { CompanyOSDecisionEvidence } from '../../../../packages/evidence-contracts/src/companyosDecisionEvidence.ts';

export class CompanyOSIngestService {
  async ingestDecision(evidence: CompanyOSDecisionEvidence): Promise<void> {
    // In a real implementation, this would write to the Neo4j graph
    // specifically creating a GovernanceDecision node linked to the Run/Flow
    console.log(`[IntelGraph] Ingesting companyOS decision: ${evidence.evidenceId}`);

    // For MWS verification:
    if (!evidence.evidenceId.startsWith('EVID:')) {
      throw new Error('Invalid evidence ID format');
    }
  }
}
