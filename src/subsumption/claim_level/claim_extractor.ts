export type ExtractedClaim = { claim_id: string; text: string };

/**
 * Extracts atomic claims from a draft answer.
 * Currently uses a heuristic split. In future, this will use an LLM.
 * Feature-flagged logic should be handled by the caller or build configuration.
 */
export function extractClaims(draft: string): ExtractedClaim[] {
  // Simple heuristic: split by sentence terminators.
  // This is a placeholder for the "Innovation" lane.
  if (!draft) return [];

  const parts = draft
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  return parts.map((text, i) => ({
    claim_id: `CLM-${String(i + 1).padStart(3, "0")}`,
    text
  }));
}
