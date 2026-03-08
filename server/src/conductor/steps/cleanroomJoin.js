"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanroomJoin = cleanroomJoin;
const dp_js_1 = require("../../dp.js");
async function cleanroomJoin(ctx, step) {
    const cfg = step.inputs || {};
    const joined = await ctx.enclave.join(cfg.joinKeys || [], cfg.select || []);
    if (cfg.dp && Array.isArray(cfg.dp.columns)) {
        for (const col of cfg.dp.columns)
            joined[col] = (0, dp_js_1.applyDp)(joined[col], cfg.dp);
    }
    ctx.emitArtifact('cleanroom.json', Buffer.from(JSON.stringify(joined)));
}
