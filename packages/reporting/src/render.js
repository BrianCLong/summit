"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderReport = renderReport;
// Report rendering is deterministic and only from verified claims.
function renderReport(input) {
    // enforce: all referenced claim_cids must be in verified set
    const verified = new Set(input.claims.map(c => c.claim_cid));
    for (const sec of input.sections) {
        for (const st of sec.statement_claims) {
            for (const cid of st.claim_cids) {
                if (!verified.has(cid)) {
                    throw new Error(`UNVERIFIED_CLAIM_REFERENCED:${cid}`);
                }
            }
        }
    }
    const claims_used = Array.from(verified).sort(); // deterministic ordering
    const evidence_cids = Array.from(new Set(input.claims.flatMap(c => c.evidence_cids))).sort();
    return {
        schema_version: "1",
        case_id: input.case_id,
        claims_used,
        evidence_cids,
        sections: input.sections.map(s => ({
            title: s.title,
            statements: s.statement_claims.map(st => ({ text: st.text, claim_cids: st.claim_cids.slice().sort() }))
        }))
    };
}
