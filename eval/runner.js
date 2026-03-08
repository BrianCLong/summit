"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
// Placeholder for SDK client (assuming it's available via import)
// import { createClient } from '../sdk/typescript/src';
const program = new commander_1.Command();
program
    .name('runner.ts')
    .description('Maestro Evaluation Harness Runner (TypeScript)')
    .option('-s, --suite <path>', 'Path to evaluation suite YAML', 'eval/suites/router.yaml')
    .option('-b, --base <url>', 'Base URL for Maestro API', 'http://localhost:8080')
    .option('-t, --token <token>', 'Authentication token')
    .action((options) => {
    process.stdout.write(`Running evaluation suite: ${options.suite}\n`);
    process.stdout.write(`API Base URL: ${options.base}\n`);
    // Load suite configuration
    const _suiteConfig = JSON.parse(fs.readFileSync(options.suite, 'utf8')); // Assuming YAML is JSON for simplicity
    // Placeholder for actual evaluation logic
    process.stdout.write('Evaluation logic to be implemented here.\n');
    process.stdout.write('This runner will read datasets, invoke models, and capture metrics.\n');
    // Example of how to use the SDK (conceptual)
    // const client = createClient(options.base, options.token);
    // const runs = await client.listRuns();
    // process.stdout.write('Runs: ' + JSON.stringify(runs.data) + '\n');
    // Simulate results.json creation
    const results = [
        {
            task: 'qa_short',
            model: 'gpt-4o',
            score: 0.85,
            latency_p95: 120,
            cost_per_item: 0.001,
            error_rate: 0.01,
        },
        {
            task: 'qa_short',
            model: 'claude-3.5',
            score: 0.82,
            latency_p95: 150,
            cost_per_item: 0.0012,
            error_rate: 0.02,
        },
    ];
    const reportDir = 'reports';
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir);
    }
    const reportFileName = `report-${new Date().toISOString().replace(/:/g, '.')}.json`;
    fs.writeFileSync(path.join(reportDir, reportFileName), JSON.stringify(results, null, 2));
    process.stdout.write(`Generated report: ${path.join(reportDir, reportFileName)}\n`);
});
program.parse(process.argv);
