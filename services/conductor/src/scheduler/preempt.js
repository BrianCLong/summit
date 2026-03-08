"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybePreempt = maybePreempt;
const store_1 = require("../checkpoint/store");
async function maybePreempt(ctx, step, curPool, betterPool) {
    // Preconditions: checkpointable step, predicted savings > threshold, SLA safe
    const savingsUsd = ctx.estimateSavings(curPool, betterPool, step);
    if (savingsUsd < (step.inputs?.minSavingsUsd || 0.25))
        return false;
    const chk = await ctx.runtime.checkpoint(); // plugin emits checkpoint bytes
    await (0, store_1.writeCheckpoint)(ctx.id, step.id, chk, process.env.CHKPT_BUCKET);
    await ctx.runtime.terminate('preempt');
    await ctx.requeue(step, {
        targetPool: betterPool.id,
        resumeFrom: 'checkpoint',
    });
    return true;
}
