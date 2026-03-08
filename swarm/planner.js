"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deterministicRunId = deterministicRunId;
exports.plan = plan;
const crypto_1 = __importDefault(require("crypto"));
function deterministicRunId(req) {
    const stable = JSON.stringify(req, Object.keys(req).sort());
    return crypto_1.default.createHash("sha256").update(stable).digest("hex").slice(0, 16);
}
function plan(req) {
    const runId = deterministicRunId(req);
    return { runId, tasks: [{ taskId: "t0", description: `Execute prompt: ${req.prompt.slice(0, 50)}...`, dependsOn: [] }] };
}
