"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateDisclosureExport = evaluateDisclosureExport;
const undici_1 = require("undici");
const DEFAULT_OPA_URL = 'http://localhost:8181/v1/data/companyos/authz/disclosure_export/decision';
async function evaluateDisclosureExport(input) {
    const opaUrl = process.env.OPA_URL ?? DEFAULT_OPA_URL;
    try {
        const res = await (0, undici_1.fetch)(opaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input }),
        });
        if (!res.ok) {
            return { allow: false, reason: 'opa_error' };
        }
        const body = (await res.json());
        const result = body.result;
        return {
            allow: result?.allow === true,
            reason: result?.reason,
        };
    }
    catch (error) {
        if (process.env.NODE_ENV !== 'test') {
            console.warn('[opa] evaluation failed', error.message);
        }
        return { allow: false, reason: 'opa_error' };
    }
}
