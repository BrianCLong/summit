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
  const verifiedClaims = input.claims.filter((claim) => claim.verified === true);
  if (verifiedClaims.length !== input.claims.length) {
    throw new Error('UNVERIFIED_CLAIM_INPUT');
  }

  const verified = new Set(verifiedClaims.map((claim) => claim.claim_cid));

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
  const evidenceCids = [...new Set(verifiedClaims.flatMap((claim) => claim.evidence_cids))].sort();

  const normalizedSections = [...input.sections]
    .map((section) => ({
      title: section.title,
      statements: [...section.statement_claims]
        .map((statement) => ({
          text: statement.text,
          claim_cids: [...new Set(statement.claim_cids)].sort(),
        }))
        .sort((a, b) => a.text.localeCompare(b.text)),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    schema_version: '1',
    case_id: input.case_id,
    claims_used: claimsUsed,
    evidence_cids: evidenceCids,
    sections: normalizedSections,
  };
}
