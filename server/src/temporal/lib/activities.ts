import { otelService } from '../../middleware/observability/otel-tracing.js';

export const activities = {
  async heartbeat(payload: any) {
    const span = otelService.createSpan('temporal.activity.heartbeat', {
      payload_len: JSON.stringify(payload || {}).length,
    });
    if (span) span.end();
    return { ok: true, received: payload, ts: Date.now() };
  },
  async planRun(input: { runId: string; parameters?: any }) {
    const span = otelService.createSpan('temporal.activity.planRun', {
      'run.id': input.runId,
    });
    const steps = Array.isArray(input?.parameters?.steps)
      ? input.parameters.steps
      : ['prepare', 'execute', 'finalize'];
    const result = { plan: steps, runId: input.runId, createdAt: Date.now() };
    if (span) span.end();
    return result;
  },
  async executeStep(input: { runId: string; step: string; idx: number }) {
    // simulate work
    const span = otelService.createSpan('temporal.activity.executeStep', {
      'run.id': input.runId,
      step: input.step,
      idx: input.idx,
    });
    await new Promise((r) => setTimeout(r, 200));
    const res = {
      runId: input.runId,
      step: input.step,
      idx: input.idx,
      status: 'OK',
      ts: Date.now(),
    };
    if (span) span.end();
    return res;
  },
  async finalizeRun(input: { runId: string; result: any }) {
    const span = otelService.createSpan('temporal.activity.finalizeRun', {
      'run.id': input.runId,
    });
    const out = {
      ok: true,
      runId: input.runId,
      summary: input.result,
      finishedAt: Date.now(),
    };
    if (span) span.end();
    return out;
  },
};
