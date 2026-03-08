/**
 * Deterministic report renderer that only accepts verified claims.
 * @param {{
 *  case_id: string,
 *  claims: {claim_cid: string, evidence_cids: string[], verified: true}[],
 *  sections: {title: string, statement_claims: {text: string, claim_cids: string[]}[]}[]
 * }} input
 * @returns {import('./types.js').Report}
 */
export function renderReport(input) {
  const verified = new Set(input.claims.map((claim) => claim.claim_cid));

  for (const section of input.sections) {
    for (const statement of section.statement_claims) {
      for (const claimCid of statement.claim_cids) {
        if (!verified.has(claimCid)) {
          throw new Error(`UNVERIFIED_CLAIM_REFERENCED:${claimCid}`);
        }
      }
    }
  }

  const claimsUsed = [...verified].sort();
  const evidenceCids = [
    ...new Set(input.claims.flatMap((claim) => claim.evidence_cids)),
  ].sort();

  return {
    schema_version: '1',
    case_id: input.case_id,
    claims_used: claimsUsed,
    evidence_cids: evidenceCids,
    sections: input.sections.map((section) => ({
      title: section.title,
      statements: section.statement_claims.map((statement) => ({
        text: statement.text,
        claim_cids: [...statement.claim_cids].sort(),
      })),
    })),
  };
}
