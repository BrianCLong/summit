"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEventChain = verifyEventChain;
function verifyEventChain(events) {
    const seen = new Set();
    for (const evt of events) {
        if (seen.has(evt.evidence_id))
            return false;
        seen.add(evt.evidence_id);
    }
    return true;
}
