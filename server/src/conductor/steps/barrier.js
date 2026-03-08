"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.barrierStep = barrierStep;
async function barrierStep(ctx, step) {
    const deps = step.inputs?.waitFor || [];
    if (!ctx.waitForSteps)
        return;
    await ctx.waitForSteps(deps);
    ctx.log?.('info', `barrier passed for deps: ${deps.join(',')}`);
}
