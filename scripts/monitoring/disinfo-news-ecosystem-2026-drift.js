"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const FIXTURE_PATH = 'fixtures/disinfo/sample_bundle.json';
const OUTPUT_DIR = 'artifacts/disinfo/drift_check';
async function main() {
    console.log('Running disinfo drift check...');
    fs_1.default.mkdirSync(OUTPUT_DIR, { recursive: true });
    const inputAbs = path_1.default.resolve(FIXTURE_PATH);
    const outAbs = path_1.default.resolve(OUTPUT_DIR);
    try {
        (0, child_process_1.execSync)(`pnpm disinfo:analyze --input ${inputAbs} --out ${outAbs}`, { stdio: 'inherit' });
        const files = fs_1.default.readdirSync(OUTPUT_DIR);
        const evdDir = files.find(f => f.startsWith('EVD_'));
        if (!evdDir)
            throw new Error('No evidence output found');
        const metricsPath = path_1.default.join(OUTPUT_DIR, evdDir, 'metrics.json');
        const metrics = JSON.parse(fs_1.default.readFileSync(metricsPath, 'utf-8'));
        console.log('Metrics:', metrics);
        const MAX_LATENCY = 3000; // 3s
        const MAX_RSS = 512; // 512MB
        if (metrics.elapsed_ms > MAX_LATENCY) {
            console.error(`Latency limit exceeded: ${metrics.elapsed_ms}ms > ${MAX_LATENCY}ms`);
            process.exit(1);
        }
        if (metrics.rss_mb_est > MAX_RSS) {
            console.error(`Memory limit exceeded: ${metrics.rss_mb_est}MB > ${MAX_RSS}MB`);
            process.exit(1);
        }
        const EXPECTED_RISK = 1.0;
        const RISK_TOLERANCE = 0.05;
        if (Math.abs(metrics.risk_score - EXPECTED_RISK) > RISK_TOLERANCE) {
            console.error(`Risk score drift detected: ${metrics.risk_score} vs expected ${EXPECTED_RISK}`);
            process.exit(1);
        }
        console.log('Drift check passed.');
    }
    catch (err) {
        console.error('Drift check failed:', err);
        process.exit(1);
    }
}
main().catch(err => console.error(err));
