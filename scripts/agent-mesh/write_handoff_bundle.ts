import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR = path.resolve(__dirname, '../../artifacts/agent-mesh');

// args parsing
const args = process.argv.slice(2);
function getArg(flag: string): string | null {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return null;
}

const agent = getArg('--agent');
const jobId = getArg('--job-id');
const stepId = getArg('--step-id');
const outputsFile = getArg('--outputs');
const evidenceFile = getArg('--evidence');
const inputsHash = getArg('--inputs-hash');
const promptRefFile = getArg('--prompt-ref');

async function main() {
  if (!agent || !jobId || !stepId || !outputsFile || !evidenceFile || !inputsHash || !promptRefFile) {
    console.error('Usage: tsx write_handoff_bundle.ts --agent <name> --job-id <uuid> --step-id <id> --outputs <json_file> --evidence <json_file> --inputs-hash <hash> --prompt-ref <json_file>');
    process.exit(1);
  }

  // Read files
  const outputs = JSON.parse(fs.readFileSync(outputsFile, 'utf-8'));
  const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf-8'));
  const promptRef = JSON.parse(fs.readFileSync(promptRefFile, 'utf-8'));

  // Construct bundle
  const bundle = {
    schema_version: "1.0.0",
    agent,
    job_id: jobId,
    step_id: stepId,
    timestamp: new Date().toISOString(),
    inputs_hash: inputsHash,
    prompt_ref: promptRef,
    outputs,
    evidence,
    signature: "pending-implementation" // In a real system, we'd sign this
  };

  // Ensure output dir
  const outputDir = path.join(ARTIFACTS_DIR, jobId, agent);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write bundle
  const bundlePath = path.join(outputDir, 'handoff.json');
  fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));

  console.log(`Handoff bundle written to ${bundlePath}`);
}

main();
