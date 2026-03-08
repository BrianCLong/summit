/**
 * @typedef {{
 *   claim_cid: string,
 *   evidence_cids: string[],
 *   verified: true
 * }} VerifiedClaim
 *
 * @typedef {{
 *   schema_version: string,
 *   case_id: string,
 *   claims_used: string[],
 *   evidence_cids: string[],
 *   sections: {title: string, statements: {text: string, claim_cids: string[]}[]}[]
 * }} Report
 */

export {};
