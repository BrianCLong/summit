"use strict";
/**
 * FactCert Schema Validation
 *
 * Ensures provenance metadata conforms to the FactCertProvenance interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProvenance = validateProvenance;
function validateProvenance(provenance) {
    if (!provenance || typeof provenance !== 'object')
        return false;
    const requiredFields = [
        'validator_cert_id',
        'policy_version',
        'supervision_state',
        'review_trace_hash',
        'audit',
        'trust_center',
        'temporal'
    ];
    return requiredFields.every(field => field in provenance);
}
