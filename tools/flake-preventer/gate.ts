import * as fs from 'fs';
import * as path from 'path';

const REPORT_PATH = 'flake_report.json';
const DEFAULT_THRESHOLD = 50;

async function run() {
    const args = process.argv.slice(2);
    let threshold = DEFAULT_THRESHOLD;

    if (args.length > 0) {
        const parsed = parseInt(args[0], 10);
        if (!isNaN(parsed)) threshold = parsed;
    }

    if (!fs.existsSync(REPORT_PATH)) {
        console.error(`[FlakeGate] Report file ${REPORT_PATH} not found.`);
        process.exit(1);
    }

    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
    const score = report.riskScore || 0;

    console.log(`[FlakeGate] Risk Score: ${score} (Threshold: ${threshold})`);

    if (score > threshold) {
        console.error(`[FlakeGate] FAILED: Flake risk exceeded threshold.`);
        process.exit(1);
    } else {
        console.log(`[FlakeGate] PASSED.`);
        process.exit(0);
    }
}

run();
