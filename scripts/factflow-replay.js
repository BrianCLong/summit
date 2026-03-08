"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const transcription_js_1 = require("../server/src/factflow/adapters/transcription.js");
const diarization_js_1 = require("../server/src/factflow/adapters/diarization.js");
const verification_js_1 = require("../server/src/factflow/verification.js");
const engine_js_1 = require("../server/src/factflow/engine.js");
const evidence_id_js_1 = require("../server/src/factflow/lib/evidence_id.js");
const gate_js_1 = require("../server/src/factflow/gate.js");
async function main() {
    const args = process.argv.slice(2);
    const inputArgIndex = args.indexOf("--input");
    const outArgIndex = args.indexOf("--out");
    const publish = args.includes("--publish");
    const approve = args.includes("--approve");
    const editorIdIndex = args.indexOf("--editor_id");
    if (inputArgIndex === -1 || outArgIndex === -1) {
        console.error("Usage: tsx scripts/factflow-replay.ts --input <file> --out <dir> [--publish --approve --editor_id <id>]");
        process.exit(1);
    }
    const inputFile = args[inputArgIndex + 1];
    const outDir = args[outArgIndex + 1];
    const editorId = editorIdIndex !== -1 ? args[editorIdIndex + 1] : undefined;
    console.log(`Processing ${inputFile} -> ${outDir}`);
    if (!fs_1.default.existsSync(inputFile)) {
        console.error(`Input file not found: ${inputFile}`);
        process.exit(1);
    }
    // Ensure output directory exists
    if (!fs_1.default.existsSync(outDir)) {
        fs_1.default.mkdirSync(outDir, { recursive: true });
    }
    const audioBuffer = fs_1.default.readFileSync(inputFile);
    // Instantiate components
    const transcription = new transcription_js_1.MockTranscriptionAdapter();
    const diarization = new diarization_js_1.MockDiarizationAdapter();
    const verification = new verification_js_1.MockVerificationEngine();
    const engine = new engine_js_1.FactFlowEngine(transcription, diarization, verification);
    const gate = new gate_js_1.PublishGate();
    const jobId = "replay_" + Date.now();
    try {
        const { report, metrics } = await engine.process(jobId, audioBuffer);
        // Generate Stamp
        const stamp = {
            job_id: jobId,
            hash: (0, evidence_id_js_1.evidenceIdFromBytes)(Buffer.from(JSON.stringify(report))),
            version: "1.0.0",
            generated_at: new Date().toISOString(),
        };
        // Write Artifacts
        fs_1.default.writeFileSync(path_1.default.join(outDir, "report.json"), JSON.stringify(report, null, 2));
        fs_1.default.writeFileSync(path_1.default.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));
        fs_1.default.writeFileSync(path_1.default.join(outDir, "stamp.json"), JSON.stringify(stamp, null, 2));
        console.log("Internal artifacts generated successfully.");
        // Publish Gate
        if (publish) {
            if (!approve || !editorId) {
                console.error("Error: --publish requires --approve and --editor_id");
                process.exit(1); // Fail
            }
            const mockUser = {
                id: editorId,
                email: "editor@example.com",
                role: "EDITOR", // Mock role
            };
            const allowed = gate.checkPublishPermission(mockUser, report);
            if (!allowed) {
                console.error("Publish denied by policy (content needs review or insufficient permissions).");
                process.exit(1);
            }
            // Generate Widget Payload
            const widgetPayload = {
                embed_url: `https://embed.factflow.news/widget?job=${jobId}`,
                claims_preview: report.claims.slice(0, 3)
            };
            fs_1.default.writeFileSync(path_1.default.join(outDir, "widget_payload.json"), JSON.stringify(widgetPayload, null, 2));
            console.log("Public widget payload emitted.");
        }
    }
    catch (error) {
        console.error("Error processing:", error);
        process.exit(1);
    }
}
main();
