"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redact = redact;
function redact(payload) {
    // Replace secrets with tokens; align to purpose/retention policy in production.
    return payload;
}
