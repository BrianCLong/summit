"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsignedManifest = unsignedManifest;
exports.manifestCanonicalString = manifestCanonicalString;
exports.claimCanonicalString = claimCanonicalString;
const canonical_1 = require("./canonical");
function unsignedManifest(manifest) {
    const { signature: _signature, ...rest } = manifest;
    return rest;
}
function manifestCanonicalString(manifest) {
    return (0, canonical_1.canonicalize)(unsignedManifest(manifest));
}
function claimCanonicalString(manifest) {
    return (0, canonical_1.canonicalize)(manifest.claim);
}
