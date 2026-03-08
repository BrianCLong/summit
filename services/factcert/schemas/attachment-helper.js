"use strict";
/**
 * FactCert Attachment Helper
 *
 * Utilities for embedding provenance metadata into reports and certified outputs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedProvenance = embedProvenance;
exports.extractProvenance = extractProvenance;
function embedProvenance(target, provenance) {
    return {
        ...target,
        provenance
    };
}
function extractProvenance(output) {
    return output?.provenance;
}
