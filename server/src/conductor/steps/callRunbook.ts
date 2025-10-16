import { startRun, onRunComplete } from '../start.js';

export async function callRunbookStep(ctx: any, step: any) {
  const ref = step.inputs?.runbookRef || 'unknown';
  const child = await startRun({
    runbookRef: ref,
    parentRunId: ctx.id,
    labels: ctx.labels,
  });
  await onRunComplete(child.id, ctx.cancelToken);
  ctx.log?.('info', `callRunbook child completed: ${child.id}`);
}
