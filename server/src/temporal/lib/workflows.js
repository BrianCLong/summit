"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCoreJob = runCoreJob;
exports.orchestrateRun = orchestrateRun;
// Minimal workflow example; real workflows should be authored with temporalio SDK
async function runCoreJob(input) {
    return { ok: true, input, ts: Date.now() };
}
// Orchestrate a core run with simple plan/execute/finalize
async function orchestrateRun(input) {
    const { tenantId } = input;
    // @ts-ignore - runtime provided by temporal worker
    const { planRun, executeStep, finalizeRun } = global.activities ?? {};
    let runRepo = null;
    try {
        // Lazy import to avoid hard coupling when disabled
        runRepo = (await Promise.resolve().then(() => __importStar(require('../../maestro/runs/runs-repo.js')))).runsRepo;
    }
    catch { }
    // OTEL span + traceId capture
    let traceId = undefined;
    let rootSpan = null;
    try {
        const { otelService } = await Promise.resolve().then(() => __importStar(require('../../middleware/observability/otel-tracing.js')));
        rootSpan = otelService.createSpan('temporal.orchestrateRun', {
            'run.id': input.runId,
        });
        if (rootSpan && typeof rootSpan.spanContext === 'function') {
            traceId = rootSpan.spanContext().traceId;
        }
    }
    catch { }
    // Persist: mark running
    try {
        if (runRepo && tenantId) {
            const prev = await runRepo.get(input.runId, tenantId);
            const out = { ...(prev?.output_data || {}), otelTraceId: traceId };
            await runRepo.update(input.runId, { status: 'running', started_at: new Date(), output_data: out }, tenantId);
        }
    }
    catch { }
    try {
        const plan = await planRun({
            runId: input.runId,
            parameters: input.parameters,
        });
        const results = [];
        let idx = 0;
        for (const step of plan.plan) {
            // OTEL per-step
            try {
                const { otelService } = await Promise.resolve().then(() => __importStar(require('../../middleware/observability/otel-tracing.js')));
                const s = otelService.createSpan('temporal.executeStep', {
                    'run.id': input.runId,
                    step,
                    idx,
                });
                if (s)
                    s.end();
            }
            catch { }
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
                await runRepo.update(input.runId, { status: 'succeeded', completed_at: new Date(), output_data: out }, tenantId);
            }
        }
        catch { }
        try {
            if (rootSpan)
                rootSpan.end();
        }
        catch { }
        return summary;
    }
    catch (e) {
        try {
            if (runRepo && tenantId) {
                const prev = await runRepo.get(input.runId, tenantId);
                const out = { ...(prev?.output_data || {}), otelTraceId: traceId };
                await runRepo.update(input.runId, {
                    status: 'failed',
                    completed_at: new Date(),
                    error_message: String(e?.message || e),
                    output_data: out,
                }, tenantId);
            }
        }
        catch { }
        try {
            if (rootSpan)
                rootSpan.end();
        }
        catch { }
        throw e;
    }
}
