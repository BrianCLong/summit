"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quarantineDrop = exports.quarantineRetry = exports.evaluate = exports.createRule = void 0;
const post = async (url, body) => {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok)
        throw new Error(`Request failed: ${res.status}`);
    return res.json();
};
const createRule = (base, rule) => post(`${base}/dq/rules`, rule);
exports.createRule = createRule;
const evaluate = (base, payload, rules) => post(`${base}/dq/evaluate`, { payload, rules });
exports.evaluate = evaluate;
const quarantineRetry = (base, id) => post(`${base}/dq/quarantine/retry`, { item_id: id });
exports.quarantineRetry = quarantineRetry;
const quarantineDrop = (base, id, reason) => post(`${base}/dq/quarantine/drop`, { item_id: id, reason });
exports.quarantineDrop = quarantineDrop;
