"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAuthz = checkAuthz;
// @ts-nocheck
const crypto_1 = require("crypto");
const DECISION_URL = process.env.OPA_DECISION_URL ||
    "http://localhost:8181/v1/data/policy/authz/abac/decision";
function hashSubject(id) {
    return (0, crypto_1.createHash)("sha256").update(id).digest("hex").slice(0, 8);
}
async function checkAuthz(input) {
    const traceId = (0, crypto_1.randomUUID)();
    const res = await fetch(DECISION_URL, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-trace-id": traceId,
        },
        body: JSON.stringify({ input }),
    });
    if (!res.ok) {
        throw new Error(`OPA returned status ${res.status}`);
    }
    const body = (await res.json());
    if (!body.result) {
        throw new Error("OPA decision missing");
    }
    console.info(JSON.stringify({
        traceId,
        event: "authz_decision",
        subject: hashSubject(input.subject.id),
        action: input.action,
        tenant: input.resource.tenant,
        allow: body.result.allow,
        deny: body.result.deny,
    }));
    return body.result;
}
