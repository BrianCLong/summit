"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../packages/policy-cards/src/index.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
function now() { return Date.now(); }
async function main() {
    const start = now();
    // Input: Environment variable POLICY_FILE or default to a dummy one for testing
    const policyPath = process.env.POLICY_FILE;
    let policyText = "{}\n";
    if (policyPath) {
        if (fs_1.default.existsSync(policyPath)) {
            policyText = fs_1.default.readFileSync(policyPath, 'utf-8');
        }
        else {
            console.error(`Policy file not found: ${policyPath}`);
            process.exit(1);
        }
    }
    const canonical = (0, index_js_1.canonicalizePolicy)(policyText);
    const res = (0, index_js_1.validatePolicy)(canonical);
    const evidenceId = process.env.EVIDENCE_ID ?? `EVID-POLICY-${new Date().toISOString().split('T')[0]}-UNKNOWN-report`;
    const report = { ok: res.ok, errors: res.errors, policyHash: res.hash, evidenceId };
    const metrics = { validation_ms: now() - start, errors_count: res.errors.length };
    const stamp = { evidenceId, ts: new Date().toISOString(), policyHash: res.hash ?? null };
    // Output directory
    const artifactDir = process.env.ARTIFACT_DIR || path_1.default.join(process.cwd(), "artifacts", "policy");
    if (!fs_1.default.existsSync(artifactDir)) {
        fs_1.default.mkdirSync(artifactDir, { recursive: true });
    }
    // Deterministic JSON stringify (simple version: ensure keys are ordered if we were building the object dynamically,
    // but here the types define the order mostly. For true determinism we'd use a library like 'fast-json-stable-stringify'
    // but let's stick to standard JSON.stringify for v0 with the assumption that key order is preserved in modern JS engines).
    fs_1.default.writeFileSync(path_1.default.join(artifactDir, "report.json"), JSON.stringify(report, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(artifactDir, "metrics.json"), JSON.stringify(metrics, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(artifactDir, "stamp.json"), JSON.stringify(stamp, null, 2));
    console.log(`Validation complete. Artifacts written to ${artifactDir}`);
    if (!res.ok) {
        console.error("Policy validation failed:", res.errors);
        process.exit(1);
    }
}
main().catch((e) => { console.error(e); process.exit(2); });
