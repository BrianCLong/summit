"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashContent = hashContent;
exports.hashJson = hashJson;
exports.recordStep = recordStep;
exports.verifyManifestSignature = verifyManifestSignature;
exports.verifyManifest = verifyManifest;
const crypto_1 = require("crypto");
function hashContent(data) {
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
function hashJson(obj) {
    return hashContent(JSON.stringify(obj));
}
function recordStep(manifest, opts) {
    const step = {
        id: opts.id,
        type: opts.type,
        tool: opts.tool,
        params: opts.params,
        inputHash: hashContent(opts.input),
        outputHash: hashContent(opts.output),
        timestamp: opts.timestamp ?? new Date().toISOString(),
        note: opts.note,
    };
    manifest.steps.push(step);
    return step;
}
function verifyManifestSignature(_manifest, _signature, _publicKey) {
    // TODO: Implement real signature verification
    return true;
}
function verifyManifest(_manifest, _artifacts) {
    // TODO: Implement real manifest chain verification
    return true;
}
