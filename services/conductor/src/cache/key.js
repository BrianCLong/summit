"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stepCacheKey = stepCacheKey;
const crypto_1 = require("crypto");
function stepCacheKey({ pluginDigest, inputDigests, params, }) {
    const h = (0, crypto_1.createHash)('sha256');
    h.update(pluginDigest);
    for (const d of [...inputDigests].sort())
        h.update('|' + d);
    h.update('|' + JSON.stringify(params ?? {}));
    return 'sha256:' + h.digest('hex');
}
