import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR = path.resolve(__dirname, '../../artifacts/agent-mesh');

const args = process.argv.slice(2);
const jobFile = args[0];

if (!jobFile) {
    console.error("Usage: tsx run_orchestrator.ts <job_file>");
    process.exit(1);
}

async function main() {
    if (!fs.existsSync(jobFile)) {
        console.error(`Job file not found: ${jobFile}`);
        process.exit(1);
    }

    const job = JSON.parse(fs.readFileSync(jobFile, 'utf-8'));
    const runId = new Date().toISOString().replace(/[:.]/g, '-');
    const runDir = path.join(ARTIFACTS_DIR, `run-${runId}`);

    console.log(`🚀 Starting Orchestrator Run: ${runId}`);
    console.log(`Job: ${job.name} (${job.job_id})`);

    // Ensure run dir
    fs.mkdirSync(runDir, { recursive: true });

    const context: Record<string, any> = {};

    for (const step of job.steps) {
        console.log(`\n▶️  Step: ${step.id} [${step.agent}]`);

        // 1. Resolve Dependencies
        if (step.dependencies) {
            for (const dep of step.dependencies) {
                if (!context[dep]) {
                    console.error(`❌ Dependency ${dep} not found or failed.`);
                    process.exit(1);
                }
            }
        }

        // 2. Prepare Inputs
        // simplified: pass raw inputs
        const inputs = step.inputs;
        const inputsHash = crypto.createHash('sha256').update(JSON.stringify(inputs)).digest('hex');

        // 3. Execute Agent (Simulation)
        console.log(`   Simulating execution for ${step.agent}...`);

        // Simulate output
        const outputs = {
            status: "success",
            timestamp: new Date().toISOString(),
            simulated_result: `Result for ${step.id}`
        };

        const evidence = [
            {
                type: "log",
                uri: `artifacts/logs/${step.id}.log`,
                hash: "dummy-hash",
                description: "Execution log"
            }
        ];

        // 4. Create Handoff Bundle
        const bundle = {
            schema_version: "1.0.0",
            agent: step.agent,
            job_id: job.job_id,
            step_id: step.id,
            timestamp: new Date().toISOString(),
            inputs_hash: inputsHash,
            prompt_ref: {
                name: "default",
                version: step.version,
                hash: "dummy-prompt-hash"
            },
            outputs,
            evidence,
            signature: "simulated-signature"
        };

        const bundlePath = path.join(runDir, `${step.id}_handoff.json`);
        fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
        console.log(`   ✅ Handoff bundle written: ${path.relative(process.cwd(), bundlePath)}`);

        // Update context
        context[step.id] = bundle;
    }

    // Generate Run Report
    const report = {
        job_id: job.job_id,
        run_id: runId,
        status: "success",
        steps: context
    };

    fs.writeFileSync(path.join(runDir, 'run-report.json'), JSON.stringify(report, null, 2));
    console.log(`\n🏁 Run Complete. Report: ${path.join(runDir, 'run-report.json')}`);
}

main();
