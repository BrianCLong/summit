
import { ClaimProvider } from './AttestationEngine.js'; // Need to export this interface or move it
import { AssuranceClaim } from '../types.js';
import { ProvenanceLedgerV2 } from '../../provenance/ledger.js';

export class ProvenanceClaimProvider implements ClaimProvider {
  domain = 'provenance';

  constructor(private ledger: ProvenanceLedgerV2) {}

  async getClaims(tenantId: string): Promise<AssuranceClaim[]> {
    const claims: AssuranceClaim[] = [];

    // Check integrity
    const integrity = await this.ledger.verifyChainIntegrity(tenantId);

    // Claim: provenance.chain.valid
    claims.push({
      id: `claim_prov_integrity_${Date.now()}`,
      domain: 'provenance',
      claim: 'provenance.chain.valid',
      value: integrity.valid,
      evidence: [{
        type: 'log',
        id: `verification_${Date.now()}`,
        hash: 'hash-of-verification-report' // In real implementation, hash the integrity report
      }],
      timestamp: new Date().toISOString(),
      validUntil: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour validity
    });

    return claims;
  }
}
