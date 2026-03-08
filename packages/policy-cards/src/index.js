"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizePolicy = void 0;
exports.validatePolicy = validatePolicy;
const canonicalize_js_1 = require("./canonicalize.js");
Object.defineProperty(exports, "canonicalizePolicy", { enumerable: true, get: function () { return canonicalize_js_1.canonicalizePolicy; } });
function validatePolicy(input) {
    const canonical = (0, canonicalize_js_1.canonicalizePolicy)(input);
    // Placeholder validation logic.
    // In PR2/future, this will load the schema and validate.
    if (input.includes("INVALID_POLICY")) {
        return { ok: false, errors: ["Policy contains forbidden keyword"], hash: undefined };
    }
    // Return a mock hash for now.
    const hash = "SHA256-" + canonical.length;
    return { ok: true, errors: [], hash };
}
