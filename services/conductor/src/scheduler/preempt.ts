import { writeCheckpoint } from '../checkpoint/store';
export async function maybePreempt(
  ctx: any,
  step: any,
  curPool: any,
  betterPool: any,
) {
  // Preconditions: checkpointable step, predicted savings > threshold, SLA safe
  const savingsUsd = ctx.estimateSavings(curPool, betterPool, step);
  if (savingsUsd < (step.inputs?.minSavingsUsd || 0.25)) return false;
  const chk = await ctx.runtime.checkpoint(); // plugin emits checkpoint bytes
  await writeCheckpoint(ctx.id, step.id, chk, process.env.CHKPT_BUCKET!);
  await ctx.runtime.terminate('preempt');
  await ctx.requeue(step, {
    targetPool: betterPool.id,
    resumeFrom: 'checkpoint',
  });
  return true;
}
