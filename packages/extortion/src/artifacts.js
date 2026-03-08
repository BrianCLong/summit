"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEvidenceId = generateEvidenceId;
exports.createDeterministicArtifact = createDeterministicArtifact;
const crypto_1 = require("crypto");
function generateEvidenceId(type, date, content) {
    const canonical = JSON.stringify(content, Object.keys(content).sort());
    const hash = (0, crypto_1.createHash)('sha256').update(canonical).digest('hex').substring(0, 8);
    const formattedDate = date.replace(/-/g, '');
    return `EVD-${type.toUpperCase()}-${formattedDate}-${hash}`;
}
function createDeterministicArtifact(content) {
    // Ensure stable property ordering
    const stableContent = sortObjectKeys(content);
    return stableContent;
}
function sortObjectKeys(obj) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        if (Array.isArray(obj)) {
            return obj.map(sortObjectKeys);
        }
        return obj;
    }
    return Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
    }, {});
}
