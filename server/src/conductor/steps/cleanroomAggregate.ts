export async function cleanroomAggregate(ctx: any, step: any) {
  const { groupBy = [], metrics = [], dp } = step.inputs || {};
  const agg = await ctx.enclave.aggregate(groupBy, metrics);
  // TODO: apply per-metric DP noise if requested
  ctx.emitArtifact('aggregate.json', Buffer.from(JSON.stringify(agg)));
}
