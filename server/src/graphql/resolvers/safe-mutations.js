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
exports.SafeMutationsResolvers = void 0;
const api_1 = require("@opentelemetry/api");
exports.SafeMutationsResolvers = {
    Mutation: {
        async createRunDraft(_parent, args, ctx, _info) {
            const { input } = args;
            const tracer = api_1.trace.getTracer('maestro');
            return await tracer.startActiveSpan('createRunDraft', async (span) => {
                try {
                    const auditId = `audit-${Date.now()}`;
                    // TODO: enforce idempotency via audit/outbox store; validate DAG/policies
                    return {
                        status: 'VALIDATED',
                        warnings: [],
                        diff: { plan: 'draft-only', pipelineId: input.pipelineId },
                        auditId,
                    };
                }
                finally {
                    span.end();
                }
            });
        },
        async startRun(_parent, args, ctx, _info) {
            const { input } = args;
            const tracer = api_1.trace.getTracer('maestro');
            return await tracer.startActiveSpan('startRun', async (span) => {
                try {
                    const dryRun = !!input?.meta?.dryRun;
                    const auditId = `audit-${Date.now()}`;
                    const autonomyLevel = Number(process.env.AUTONOMY_LEVEL || '1');
                    const executeEnabled = process.env.RUNS_EXECUTE_ENABLED !== 'false';
                    if (!dryRun && (!executeEnabled || autonomyLevel < 2)) {
                        return {
                            status: 'BLOCKED_BY_POLICY',
                            warnings: ['Execution disabled by policy or autonomy level'],
                            diff: { requested: { canaryPercent: input.canaryPercent ?? 5 } },
                            auditId,
                        };
                    }
                    if (dryRun) {
                        return {
                            status: 'PLANNED',
                            warnings: [],
                            diff: { plan: 'no-side-effects', pipelineId: input.pipelineId },
                            auditId,
                        };
                    }
                    // TODO: enqueue via outbox; start saga orchestrator
                    return {
                        status: 'QUEUED',
                        warnings: [],
                        diff: { canaryPercent: input.canaryPercent ?? 5 },
                        auditId,
                    };
                }
                finally {
                    span.end();
                }
            });
        },
        async registerUATCheckpoint(_parent, args, _ctx, _info) {
            const tracer = api_1.trace.getTracer('maestro');
            return await tracer.startActiveSpan('registerUATCheckpoint', async (span) => {
                try {
                    const auditId = `audit-${Date.now()}`;
                    try {
                        const { addUATCheckpoint } = await Promise.resolve().then(() => __importStar(require('../../db/repositories/uat.js')));
                        await addUATCheckpoint({
                            run_id: args.runId,
                            checkpoint: args.checkpoint,
                            verdict: args.verdict,
                            evidence_uris: args.evidenceURIs,
                            actor: undefined,
                        });
                    }
                    catch { }
                    return {
                        status: 'RECORDED',
                        warnings: [],
                        diff: {
                            runId: args.runId,
                            checkpoint: args.checkpoint,
                            verdict: args.verdict,
                        },
                        auditId,
                    };
                }
                finally {
                    span.end();
                }
            });
        },
    },
};
