"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = evaluate;
async function evaluate(input) {
    const url = process.env.OPA_URL ?? 'http://localhost:8181/v1/data/graphql/guard';
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
    });
    if (!res.ok)
        throw new Error(`OPA decision failed: ${res.status}`);
    const json = (await res.json());
    const result = json.result ?? {};
    return {
        allow: Boolean(result.allow),
        obligations: result.obligations ?? [],
    };
}
