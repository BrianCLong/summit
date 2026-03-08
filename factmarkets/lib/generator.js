"use strict";
/**
 * FactMarkets Report Generator (Example)
 *
 * Demonstrates integration with FactCert for provenance attachment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCertifiedReport = generateCertifiedReport;
const index_js_1 = require("../../services/factcert/index.js");
const evidence_id_js_1 = require("./evidence_id.js");
async function generateCertifiedReport(data, reviewers) {
    // 1. Generate base report
    const report = {
        evidence_id: (0, evidence_id_js_1.generateEvidenceId)(data),
        summary: "Financial markets analysis report",
        claims: [
            {
                claim_id: "CLAIM-001",
                text: "Market manipulation detected in sector X",
                status: "VERIFIED"
            }
        ],
        limitations: [],
        needs_review: false
    };
    // 2. Attach FactCert provenance
    const certifiedReport = await (0, index_js_1.attachProvenance)(report, {
        domain: 'finance',
        reviewers: reviewers,
        auditOptions: { enableBlackbox: true, archiveToLake: true },
        assuranceLevel: 'enterprise'
    });
    return certifiedReport;
}
