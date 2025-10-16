// Minimal workflow example; real workflows should be authored with temporalio SDK
export async function runCoreJob(input: any): Promise<any> {
  return { ok: true, input, ts: Date.now() };
}

// Orchestrate a core run with simple plan/execute/finalize
export async function orchestrateRun(input: {
  runId: string;
  tenantId?: string;
  parameters?: any;
}): Promise<any> {
  const { tenantId } = input;
  // @ts-ignore - runtime provided by temporal worker
  const { planRun, executeStep, finalizeRun } =
    (global as any).activities ?? {};
  let runRepo: any = null;
  try {
    // Lazy import to avoid hard coupling when disabled
    runRepo = (await import('../../maestro/runs/runs-repo.js')).runsRepo;
  } catch {}

  // OTEL span + traceId capture
  let traceId: string | undefined = undefined;
  let rootSpan: any = null;
  try {
    const { otelService } = await import(
      '../../middleware/observability/otel-tracing.js'
    );
    rootSpan = otelService.createSpan('temporal.orchestrateRun', {
      'run.id': input.runId,
    });
    if (rootSpan && typeof rootSpan.spanContext === 'function') {
      traceId = rootSpan.spanContext().traceId;
    }
  } catch {}

  // Persist: mark running
  try {
    if (runRepo && tenantId) {
      const prev = await runRepo.get(input.runId, tenantId);
      const out = { ...(prev?.output_data || {}), otelTraceId: traceId };
      await runRepo.update(
        input.runId,
        { status: 'running', started_at: new Date(), output_data: out },
        tenantId,
      );
    }
  } catch {}

  try {
    const plan = await planRun({
      runId: input.runId,
      parameters: input.parameters,
    });
    const results: any[] = [];
    let idx = 0;
    for (const step of plan.plan) {
      // OTEL per-step
      try {
        const { otelService } = await import(
          '../../middleware/observability/otel-tracing.js'
        );
        const s = otelService.createSpan('temporal.executeStep', {
          'run.id': input.runId,
          step,
          idx,
        });
        if (s) s.end();
      } catch {}
      const r = await executeStep({ runId: input.runId, step, idx });
      results.push(r);
      idx++;
    }
    const summary = await finalizeRun({
      runId: input.runId,
      result: { steps: results },
    });
    // Persist: succeeded
    try {
      if (runRepo && tenantId) {
        const prev = await runRepo.get(input.runId, tenantId);
        const out = {
          ...(prev?.output_data || {}),
          ...(summary || {}),
          otelTraceId: traceId,
        };
        await runRepo.update(
          input.runId,
          { status: 'succeeded', completed_at: new Date(), output_data: out },
          tenantId,
        );
      }
    } catch {}
    try {
      if (rootSpan) rootSpan.end();
    } catch {}
    return summary;
  } catch (e: any) {
    try {
      if (runRepo && tenantId) {
        const prev = await runRepo.get(input.runId, tenantId);
        const out = { ...(prev?.output_data || {}), otelTraceId: traceId };
        await runRepo.update(
          input.runId,
          {
            status: 'failed',
            completed_at: new Date(),
            error_message: String(e?.message || e),
            output_data: out,
          },
          tenantId,
        );
      }
    } catch {}
    try {
      if (rootSpan) rootSpan.end();
    } catch {}
    throw e;
  }
}
