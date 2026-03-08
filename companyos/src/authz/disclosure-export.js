"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateDisclosureExport = evaluateDisclosureExport;
const undici_1 = require("undici");
const OPA_URL = process.env.OPA_URL ?? 'http://localhost:8181';
async function evaluateDisclosureExport(subject, resource) {
    const payload = {
        input: {
            action: 'disclosure:export',
            subject,
            resource,
        },
    };
    try {
        const res = await (0, undici_1.request)(`${OPA_URL}/v1/data/companyos/authz/disclosure_export/decision`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (res.statusCode >= 400) {
            throw new Error(`opa status ${res.statusCode}`);
        }
        const decision = (await res.body.json());
        if (!decision?.result) {
            throw new Error(`opa missing result (${res.statusCode})`);
        }
        return decision.result;
    }
    catch (error) {
        console.warn('[authz] opa decision error', error.message ?? 'unknown error');
        return { allow: false, reason: 'authorization_error' };
    }
}
