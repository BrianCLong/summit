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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReplay = runReplay;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function normalizeMessage(message) {
    return (message ?? '').toLowerCase().trim();
}
function evaluateClassification(original, currentStatus, currentMessage) {
    if (original.outcome.status === 'error') {
        if (currentStatus === 'success') {
            return 'PASS';
        }
        if (normalizeMessage(original.outcome.message) === normalizeMessage(currentMessage)) {
            return 'FAIL';
        }
        return 'DRIFT';
    }
    return currentStatus === 'success' ? 'PASS' : 'DRIFT';
}
async function runIntelGraphReplay(descriptor) {
    const { sandboxExecute } = await Promise.resolve().then(() => __importStar(require('../../ga-graphai/packages/query-copilot/src/sandbox.js')));
    const payload = descriptor.request.payload ?? {};
    const meta = descriptor.request.meta ?? {};
    try {
        sandboxExecute({
            cypher: String(payload.cypher ?? ''),
            tenantId: descriptor.context.tenantId ?? 'unknown-tenant',
            policy: meta.policy ?? {
                authorityId: 'unknown',
                purpose: descriptor.context.purpose ?? 'investigation',
            },
            timeoutMs: typeof payload.timeoutMs === 'number' ? payload.timeoutMs : undefined,
            featureFlags: meta.featureFlags ??
                descriptor.context.featureFlags,
            traceId: descriptor.context.traceId,
            requestId: descriptor.context.requestId,
            userId: descriptor.context.userIdHash,
            environment: descriptor.environment.env?.INTELGRAPH_ENV,
        });
        return {
            status: evaluateClassification(descriptor, 'success'),
            details: 'Replayed IntelGraph sandbox request without error.',
        };
    }
    catch (error) {
        return {
            status: evaluateClassification(descriptor, 'error', error instanceof Error ? error.message : String(error)),
            details: error instanceof Error
                ? error.message
                : 'Replay failed with unknown error.',
        };
    }
}
async function runMaestroReplay(descriptor) {
    const payload = descriptor.request.payload;
    try {
        const { runReferenceWorkflow } = await Promise.resolve().then(() => __importStar(require('../../ga-graphai/packages/meta-orchestrator/src/index.js')));
        const result = await runReferenceWorkflow(payload ?? {});
        const failed = result.outcome.trace.some((entry) => entry.status === 'failed');
        return {
            status: evaluateClassification(descriptor, failed ? 'error' : 'success', failed ? 'stage failure' : undefined),
            details: failed
                ? 'Replay reproduced a failed stage execution.'
                : 'Replay completed without failed stages.',
        };
    }
    catch (error) {
        return {
            status: evaluateClassification(descriptor, 'error', error instanceof Error ? error.message : String(error)),
            details: error instanceof Error
                ? error.message
                : 'Replay crashed with unknown error.',
        };
    }
}
async function runReplay(replayPath) {
    const fullPath = node_path_1.default.resolve(replayPath);
    if (!node_fs_1.default.existsSync(fullPath)) {
        throw new Error(`Replay file not found: ${fullPath}`);
    }
    const raw = node_fs_1.default.readFileSync(fullPath, 'utf-8');
    const descriptor = JSON.parse(raw);
    if (!descriptor?.service) {
        throw new Error('Invalid replay descriptor: missing service');
    }
    if (descriptor.service === 'intelgraph') {
        return runIntelGraphReplay(descriptor);
    }
    if (descriptor.service === 'maestro-conductor') {
        return runMaestroReplay(descriptor);
    }
    throw new Error(`Unsupported replay service: ${descriptor.service}`);
}
if (process.argv[1] && process.argv[1].includes('run-replay')) {
    const target = process.argv[2];
    if (!target) {
        console.error('Usage: ts-node scripts/testing/run-replay.ts <replay-file>');
        process.exit(1);
    }
    runReplay(target)
        .then((result) => {
        console.log(`Replay result: ${result.status}`);
        console.log(result.details);
    })
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
