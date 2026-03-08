"use strict";
/**
 * FactCert Shared Provenance Module
 *
 * Public API for attaching and validating FactCert provenance.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachProvenance = attachProvenance;
const node_crypto_1 = require("node:crypto");
const attachment_helper_js_1 = require("./schemas/attachment-helper.js");
const audit_logger_js_1 = require("./integrations/audit-logger.js");
const attestation_client_js_1 = require("./integrations/attestation-client.js");
const trust_center_client_js_1 = require("./integrations/trust-center-client.js");
const blockchain_anchor_js_1 = require("./integrations/blockchain-anchor.js");
__exportStar(require("./schemas/provenance.js"), exports);
__exportStar(require("./schemas/attachment-helper.js"), exports);
__exportStar(require("./schemas/validation.js"), exports);
/**
 * Attaches FactCert provenance to a report, integrating with Summit core services.
 */
async function attachProvenance(report, options) {
    // Use crypto for robust ID generation
    const validatorCertId = `CERT-${options.domain.toUpperCase()}-${(0, node_crypto_1.randomBytes)(4).toString('hex').toUpperCase()}`;
    // Create a robust trace hash of the report
    const reviewTraceHash = (0, node_crypto_1.createHash)('sha256')
        .update(JSON.stringify(report))
        .digest('hex');
    // 1. Audit Integration
    const auditInfo = await (0, audit_logger_js_1.logProvenanceEvent)(validatorCertId, report, options.auditOptions);
    // 2. Attestation Integration
    const attestationUri = await (0, attestation_client_js_1.generateAttestation)(report, options.domain);
    // 3. Trust Center Integration
    const trustInfo = await (0, trust_center_client_js_1.registerInTrustCenter)(validatorCertId, options.assuranceLevel || 'standard');
    // 4. Blockchain Anchoring (Optional)
    let blockchainAnchor;
    if (options.enableBlockchain) {
        blockchainAnchor = await (0, blockchain_anchor_js_1.anchorToBlockchain)(reviewTraceHash);
    }
    const provenance = {
        validator_cert_id: validatorCertId,
        policy_version: options.policyVersion || '1.0.0',
        supervision_state: 'APPROVED',
        review_trace_hash: reviewTraceHash,
        audit: {
            audit_log_id: auditInfo.audit_log_id,
            attestation_uri: attestationUri,
            audit_blackbox_hash: auditInfo.audit_blackbox_hash,
        },
        trust_center: {
            assurance_level: options.assuranceLevel || 'standard',
            compliance_status: trustInfo.compliance_status,
            certification_bundle_uri: trustInfo.certification_bundle_uri,
        },
        temporal: {
            issued_at: new Date().toISOString(),
        },
        blockchain_anchor: blockchainAnchor,
    };
    return (0, attachment_helper_js_1.embedProvenance)(report, provenance);
}
