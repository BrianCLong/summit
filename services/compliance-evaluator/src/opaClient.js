"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpaClient = void 0;
const undici_1 = require("undici");
class OpaClient {
    opaUrl;
    constructor(opaUrl) {
        this.opaUrl = opaUrl;
    }
    async evaluate(input) {
        const url = `${this.opaUrl}/v1/data/compliance`;
        const res = await (0, undici_1.request)(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ input })
        });
        if (res.statusCode < 200 || res.statusCode >= 300) {
            const text = await res.body.text();
            throw new Error(`OPA error ${res.statusCode}: ${text}`);
        }
        return (await res.body.json());
    }
}
exports.OpaClient = OpaClient;
