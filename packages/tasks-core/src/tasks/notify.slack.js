"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
exports.default = (0, maestro_sdk_1.defineTask)({
    async execute(ctx, { payload }) {
        const url = payload.webhook ?? (await ctx.secrets('SLACK_WEBHOOK_URL'));
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text: payload.text }),
        });
        return { payload: { ok: res.ok } };
    },
});
