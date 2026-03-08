"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvidence = emitEvidence;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const canonical_js_1 = require("../util/canonical.js");
async function emitEvidence(plan, result, policyUsed, sources = []) {
    const planJson = (0, canonical_js_1.canonicalize)(plan);
    const planHash = (0, canonical_js_1.sha256)(planJson);
    // Deterministic run ID based on plan hash (and maybe policy hash, but plan hash is good for now)
    const runId = planHash.substring(0, 12);
    // Use a standard location, e.g., artifacts/evidence/retrieval/<runId>/
    // Assuming process.cwd() is the repo root when running in production or CI
    // But for safety, we might want to allow configuring the root.
    // For this substrate, we'll try to find the root or use relative paths.
    const evidenceDir = path_1.default.join(process.cwd(), 'artifacts/evidence/retrieval', runId);
    if (!fs_1.default.existsSync(evidenceDir)) {
        fs_1.default.mkdirSync(evidenceDir, { recursive: true });
    }
    // 1. Plan
    fs_1.default.writeFileSync(path_1.default.join(evidenceDir, 'plan.json'), planJson);
    // 2. Policy
    const policyJson = (0, canonical_js_1.canonicalize)(policyUsed);
    fs_1.default.writeFileSync(path_1.default.join(evidenceDir, 'policy.json'), policyJson);
    // 3. Sources (Inputs)
    const sourcesJson = (0, canonical_js_1.canonicalize)(sources);
    fs_1.default.writeFileSync(path_1.default.join(evidenceDir, 'sources.json'), sourcesJson);
    // 4. Metrics/Result (Outcome)
    // We separate machine-readable metrics from full result if needed, but here result includes graph stats.
    const metricsJson = (0, canonical_js_1.canonicalize)({
        graph: result.graph,
        contextCount: result.contexts.length,
        // durations omitted for determinism unless strictly needed
    });
    fs_1.default.writeFileSync(path_1.default.join(evidenceDir, 'metrics.json'), metricsJson);
    // 5. Retrieval Result (The actual "output" or a pointer to it)
    // We might not want to dump full contexts if they are huge, but for now we do.
    fs_1.default.writeFileSync(path_1.default.join(evidenceDir, 'retrieval.json'), (0, canonical_js_1.canonicalize)(result));
    return evidenceDir;
}
