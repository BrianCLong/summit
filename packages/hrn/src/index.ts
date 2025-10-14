export interface HIT {
  subjectId: string;       // content or account
  epoch: number;           // period
  attestations: string[];  // attester sigs (blind or SD-JWT)
  score: number;           // derived credibility
}

export interface CredentialingNode {
  id: string;
  publicKey: string;
  weight: number;
}

export function issueHIT(subjectId: string, nodes: CredentialingNode[], signatures: string[]): HIT {
  // Placeholder for actual threshold-signature or PBFT logic
  if (signatures.length < nodes.length * (2/3)) {
    throw new Error("Not enough weighted signatures to issue HIT");
  }
  const score = signatures.length / nodes.length; // Simple score for MVP
  return {
    subjectId,
    epoch: Math.floor(Date.now() / 1000),
    attestations: signatures,
    score
  };
}

export function verifyHIT(hit: HIT, _nodes: CredentialingNode[]): boolean {
  // Placeholder for actual threshold-signature or PBFT verification
  return hit.score > 0.5; // Simple verification for MVP
}