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
exports.executeOnWorker = executeOnWorker;
exports.startWorkerHealthLoop = startWorkerHealthLoop;
const grpc = __importStar(require("@grpc/grpc-js"));
const targets = (process.env.WORKERS || 'python-runner:50051')
    .split(',')
    .filter(Boolean)
    .map((addr) => ({ addr, healthy: true, failures: 0 }));
let rr = 0;
const MAX_INFLIGHT = Number(process.env.WORKER_MAX_INFLIGHT || 100);
let inflight = 0;
function pickTarget() {
    const healthy = targets.filter((t) => t.healthy);
    if (!healthy.length)
        return null;
    rr = (rr + 1) % healthy.length;
    return healthy[rr];
}
async function executeOnWorker(step, runId) {
    if (inflight >= MAX_INFLIGHT) {
        await new Promise((r) => setTimeout(r, 50));
    }
    const t = pickTarget();
    if (!t)
        throw new Error('no healthy workers');
    inflight++;
    try {
        // Lazy import generated client at runtime (placeholder path)
        const { StepRunnerClient } = await Promise.resolve().then(() => __importStar(require('./gen/runner_grpc_pb.js')));
        const { StepRequest } = await Promise.resolve().then(() => __importStar(require('./gen/runner_pb.js')));
        const client = new StepRunnerClient(t.addr, grpc.credentials.createInsecure());
        const req = new StepRequest();
        req.setRunId(runId);
        req.setStepId(step.id);
        req.setType(step.type);
        req.setPayloadJson(JSON.stringify(step.inputs || {}));
        return new Promise((resolve, reject) => {
            client.execute(req, (err, res) => {
                if (err) {
                    t.failures++;
                    if (t.failures > 3)
                        t.healthy = false;
                    reject(err);
                }
                else {
                    t.failures = 0;
                    t.healthy = true;
                    resolve(res);
                }
            });
        });
    }
    finally {
        inflight--;
    }
}
// Basic health check loop
function startWorkerHealthLoop() {
    setInterval(async () => {
        for (const t of targets) {
            try {
                const sock = new grpc.Client(t.addr, grpc.credentials.createInsecure());
                sock.close();
                t.healthy = true;
                t.failures = 0;
            }
            catch {
                t.failures++;
                if (t.failures > 3)
                    t.healthy = false;
            }
        }
    }, 5000);
}
