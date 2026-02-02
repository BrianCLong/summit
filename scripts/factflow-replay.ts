import fs from "fs";
import path from "path";
import { MockTranscriptionAdapter } from "../server/src/factflow/adapters/transcription.js";
import { MockDiarizationAdapter } from "../server/src/factflow/adapters/diarization.js";
import { MockVerificationEngine } from "../server/src/factflow/verification.js";
import { FactFlowEngine } from "../server/src/factflow/engine.js";
import { evidenceIdFromBytes } from "../server/src/factflow/lib/evidence_id.js";
import { PublishGate } from "../server/src/factflow/gate.js";
import { User } from "../server/src/lib/auth.js";

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

  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const audioBuffer = fs.readFileSync(inputFile);

  // Instantiate components
  const transcription = new MockTranscriptionAdapter();
  const diarization = new MockDiarizationAdapter();
  const verification = new MockVerificationEngine();
  const engine = new FactFlowEngine(transcription, diarization, verification);
  const gate = new PublishGate();

  const jobId = "replay_" + Date.now();

  try {
    const { report, metrics } = await engine.process(jobId, audioBuffer);

    // Generate Stamp
    const stamp = {
      job_id: jobId,
      hash: evidenceIdFromBytes(Buffer.from(JSON.stringify(report))),
      version: "1.0.0",
      generated_at: new Date().toISOString(),
    };

    // Write Artifacts
    fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));
    fs.writeFileSync(path.join(outDir, "stamp.json"), JSON.stringify(stamp, null, 2));

    console.log("Internal artifacts generated successfully.");

    // Publish Gate
    if (publish) {
        if (!approve || !editorId) {
            console.error("Error: --publish requires --approve and --editor_id");
            process.exit(1); // Fail
        }

        const mockUser: User = {
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
        fs.writeFileSync(path.join(outDir, "widget_payload.json"), JSON.stringify(widgetPayload, null, 2));
        console.log("Public widget payload emitted.");
    }

  } catch (error: any) {
    console.error("Error processing:", error);
    process.exit(1);
  }
}

main();
