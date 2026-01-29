import { ExtractedClaim } from './claim_extractor';

export type ClaimSupport = "supported" | "unsupported" | "contradicted" | "unknown";

export type VerifiedClaim = ExtractedClaim & {
  support: ClaimSupport;
  evidence_refs: string[];
};

/**
 * Mock implementation of a claim verifier.
 * In a real scenario, this would query the graph using "composable micro-queries".
 */
export async function verifyClaim(claim: ExtractedClaim): Promise<VerifiedClaim> {
  // Mock logic:
  // - "green cheese" -> unsupported
  // - "flat" -> contradicted
  // - others -> supported

  const lower = claim.text.toLowerCase();
  let support: ClaimSupport = "supported";
  let evidence_refs: string[] = ["EVD-GRAPH-NODE-123"];

  if (lower.includes("green cheese")) {
    support = "unsupported";
    evidence_refs = [];
  } else if (lower.includes("flat")) {
    support = "contradicted";
    evidence_refs = ["EVD-GRAPH-NODE-SPHERE"];
  }

  return {
    ...claim,
    support,
    evidence_refs
  };
}
