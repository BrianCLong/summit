"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putPolicy = putPolicy;
exports.putData = putData;
const undici_1 = require("undici");
async function putPolicy(rego, id = 'cos.abac') {
    const res = await (0, undici_1.request)(`${process.env.OPA_URL}/v1/policies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: rego,
    });
    if (res.statusCode >= 300)
        throw new Error(`OPA putPolicy ${res.statusCode}`);
}
async function putData(path, data) {
    const res = await (0, undici_1.request)(`${process.env.OPA_URL}/v1/data/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (res.statusCode >= 300)
        throw new Error(`OPA putData ${res.statusCode}`);
}
