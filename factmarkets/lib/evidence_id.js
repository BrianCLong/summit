"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEvidenceId = generateEvidenceId;
const node_crypto_1 = require("node:crypto");
const stable_json_js_1 = require("./stable_json.js");
function generateEvidenceId(content) {
    let input;
    if (Buffer.isBuffer(content)) {
        input = content;
    }
    else if (typeof content === 'string') {
        input = content;
    }
    else {
        input = (0, stable_json_js_1.stableStringify)(content);
    }
    const hash = (0, node_crypto_1.createHash)('sha256').update(input).digest('hex');
    const shortHash = hash.substring(0, 12);
    return `EVID_${shortHash}`;
}
