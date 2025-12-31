
import { ClaimProvider } from './AttestationEngine.js';
import { AssuranceClaim } from '../types.js';

export class GovernanceClaimProvider implements ClaimProvider {
  domain = 'governance';

  async getClaims(tenantId: string): Promise<AssuranceClaim[]> {
    const claims: AssuranceClaim[] = [];

    // REAL CHECK: Query OPA status or Policy Service
    // Failing closed: No claims emitted if service is unreachable.

    return claims;
  }
}
