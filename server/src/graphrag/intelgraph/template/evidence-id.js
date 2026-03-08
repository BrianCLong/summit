"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEvidenceId = generateEvidenceId;
function generateEvidenceId(pattern = 'IG-EVID-######') {
    // A simplistic mock generator.
    const randomStr = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return pattern.replace('######', randomStr);
}
