"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canExport = canExport;
function canExport(licenses, datasetId) {
    const lic = licenses.find((l) => l.id === datasetId);
    if (!lic) {
        return { allowed: false, reason: 'unknown_dataset' };
    }
    if (lic.terms.export === 'deny') {
        return { allowed: false, reason: 'license_denied' };
    }
    return { allowed: true };
}
