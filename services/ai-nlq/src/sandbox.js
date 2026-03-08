"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safe = safe;
exports.runSandbox = runSandbox;
// services/ai-nlq/src/sandbox.ts
const FORBIDDEN = [/DELETE\s/i, /DETACH\s/i, /CREATE\s/i, /MERGE\s/i, /SET\s/i];
function safe(cypher) {
    if (FORBIDDEN.some(r => r.test(cypher)))
        return { ok: false, reason: "destructive token" };
    return { ok: true };
}
function runSandbox(cypher) {
    return [{ id: "p1", label: "Person" }, { id: "o1", label: "Org" }];
}
