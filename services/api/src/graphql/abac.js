"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opaDecision = opaDecision;
exports.filterFields = filterFields;
exports.withABAC = withABAC;
async function opaDecision(input) {
    const url = (process.env.OPA_URL || 'http://opa:8181').replace(/\/$/, '') +
        '/v1/data/intelgraph/authz';
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input }),
    });
    if (!res.ok)
        return { allow: false, fields: [], reason: 'opa_error_' + res.status };
    const data = await res.json();
    const allow = Boolean(data?.result?.allow ?? data?.result === true);
    const fields = data?.result?.allowed_fields || [];
    const reason = data?.result?.deny_reason || null;
    return { allow, fields, reason };
}
function filterFields(value, fields) {
    // Pass-through if no restrictions
    if (!value || !Array.isArray(fields) || fields.length === 0)
        return value;
    const allow = new Set(fields);
    if (Array.isArray(value))
        return value.map((v) => filterFields(v, fields));
    if (typeof value !== 'object')
        return value;
    const v = value;
    const pick = {};
    for (const f of allow) {
        if (f.includes(':')) {
            const [k, sub] = f.split(':');
            if (v[k] && typeof v[k] === 'object') {
                pick[k] = pick[k] || {};
                if (v[k][sub] !== undefined) {
                    pick[k][sub] = v[k][sub];
                }
            }
        }
        else if (v[f] !== undefined) {
            pick[f] = v[f];
        }
    }
    return (Object.keys(pick).length ? pick : value);
}
function withABAC(resolver, action = 'read') {
    return async (parent, args, ctx, info) => {
        const role = ctx?.user?.role || 'analyst';
        const sensitivity = ctx?.req?.headers?.['x-resource-sensitivity'] || 'public';
        const decision = await opaDecision({
            user: { role },
            action,
            resource: { sensitivity },
        });
        if (!decision.allow) {
            const e = new Error('Forbidden');
            e.extensions = { code: 'FORBIDDEN', reason: decision.reason };
            throw e;
        }
        const result = await resolver(parent, args, ctx, info);
        return filterFields(result, decision.fields);
    };
}
