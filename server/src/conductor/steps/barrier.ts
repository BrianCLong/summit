export async function barrierStep(ctx: any, step: any) {
  const deps: string[] = step.inputs?.waitFor || [];
  if (!ctx.waitForSteps) return;
  await ctx.waitForSteps(deps);
  ctx.log?.('info', `barrier passed for deps: ${deps.join(',')}`);
}
