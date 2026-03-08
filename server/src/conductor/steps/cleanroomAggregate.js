"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanroomAggregate = cleanroomAggregate;
async function cleanroomAggregate(ctx, step) {
    const { groupBy = [], metrics = [], dp } = step.inputs || {};
    const agg = await ctx.enclave.aggregate(groupBy, metrics);
    // TODO: apply per-metric DP noise if requested
    ctx.emitArtifact('aggregate.json', Buffer.from(JSON.stringify(agg)));
}
