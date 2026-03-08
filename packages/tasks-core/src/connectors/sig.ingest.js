"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
exports.default = (0, maestro_sdk_1.defineTask)({
    async execute(ctx, { payload }) {
        const endpoint = payload.endpoint ?? (await ctx.secrets('SIG_INGEST_URL'));
        const res = await fetch(`${endpoint}/ingest/batch`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ items: payload.items }),
        });
        if (!res.ok)
            throw new Error(`SIG ingest failed ${res.status}`);
        return res.json();
    },
});
