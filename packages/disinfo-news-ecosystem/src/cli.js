"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const analyzer_js_1 = require("./analyzer.js");
const evidence_js_1 = require("./evidence.js");
async function main() {
    const args = process.argv.slice(2);
    let inputPath = '';
    let outDir = '';
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--input') {
            inputPath = args[i + 1];
            i++;
        }
        else if (args[i] === '--out') {
            outDir = args[i + 1];
            i++;
        }
    }
    if (!inputPath || !outDir) {
        console.error('Usage: --input <path> --out <dir>');
        process.exit(1);
    }
    const bundleContent = fs_1.default.readFileSync(inputPath, 'utf-8');
    const bundle = JSON.parse(bundleContent);
    const evidenceId = (0, evidence_js_1.evidenceIdFromBytes)(Buffer.from(bundleContent));
    const outputPrefix = path_1.default.join(outDir, evidenceId);
    fs_1.default.mkdirSync(outputPrefix, { recursive: true });
    const start = Date.now();
    const report = await (0, analyzer_js_1.analyzeBundle)(bundle, evidenceId);
    const elapsed = Date.now() - start;
    (0, evidence_js_1.writeDeterministicJson)(path_1.default.join(outputPrefix, 'report.json'), report);
    const metrics = {
        elapsed_ms: elapsed,
        rss_mb_est: Math.round(process.memoryUsage().rss / 1024 / 1024),
        bundle_size_bytes: bundleContent.length,
        risk_score: report.risk_score,
        unknown_source_rate: report.signals.content.unknown_source_rate || 0
    };
    (0, evidence_js_1.writeDeterministicJson)(path_1.default.join(outputPrefix, 'metrics.json'), metrics);
    const stamp = {
        version: '1.0.0',
        content_hash: evidenceId.replace('EVD_', '')
    };
    (0, evidence_js_1.writeDeterministicJson)(path_1.default.join(outputPrefix, 'stamp.json'), stamp);
    console.log(`Analysis complete. Evidence: ${evidenceId}`);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
