"use strict";
/**
 * DAG-Based Runbook Types
 *
 * Runbooks codified as Directed Acyclic Graphs with:
 * - Replay logs for auditability
 * - Gates for preconditions (legal basis, data license) and postconditions (KPIs, citations)
 * - Proof emission and citation enforcement
 * - Benchmark timing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLicense = exports.LegalBasis = void 0;
exports.createReplayLogHash = createReplayLogHash;
exports.createCitationHash = createCitationHash;
const crypto_1 = require("crypto");
/**
 * Legal basis for data processing (GDPR Article 6)
 */
var LegalBasis;
(function (LegalBasis) {
    LegalBasis["CONSENT"] = "consent";
    LegalBasis["CONTRACT"] = "contract";
    LegalBasis["LEGAL_OBLIGATION"] = "legal_obligation";
    LegalBasis["VITAL_INTERESTS"] = "vital_interests";
    LegalBasis["PUBLIC_TASK"] = "public_task";
    LegalBasis["LEGITIMATE_INTERESTS"] = "legitimate_interests";
})(LegalBasis || (exports.LegalBasis = LegalBasis = {}));
/**
 * Data license types
 */
var DataLicense;
(function (DataLicense) {
    DataLicense["PROPRIETARY"] = "proprietary";
    DataLicense["CC0"] = "cc0";
    DataLicense["CC_BY"] = "cc_by";
    DataLicense["CC_BY_SA"] = "cc_by_sa";
    DataLicense["CC_BY_NC"] = "cc_by_nc";
    DataLicense["ODbL"] = "odbl";
    DataLicense["PUBLIC_DOMAIN"] = "public_domain";
    DataLicense["INTERNAL_USE_ONLY"] = "internal_use_only";
})(DataLicense || (exports.DataLicense = DataLicense = {}));
/**
 * Helper function to create hash for replay log
 */
function createReplayLogHash(entry) {
    const data = JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        nodeId: entry.nodeId,
        eventType: entry.eventType,
        data: entry.data,
        previousHash: entry.previousHash,
    });
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
/**
 * Helper function to create citation hash
 */
function createCitationHash(citation) {
    const data = JSON.stringify({
        source: citation.source,
        url: citation.url,
        timestamp: citation.timestamp.toISOString(),
        author: citation.author,
    });
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
