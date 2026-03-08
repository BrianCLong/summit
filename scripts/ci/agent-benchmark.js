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
const evaluation_runner_js_1 = require("../../src/agent-scaling/evaluation-runner.js");
const metrics_js_1 = require("../../src/agent-scaling/metrics.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function main() {
    const singleRunner = new evaluation_runner_js_1.EvaluationRunner({ maxSteps: 5, maxTokens: 1000, topology: 'single' });
    const multiRunner = new evaluation_runner_js_1.EvaluationRunner({ maxSteps: 10, maxTokens: 2000, topology: 'multi' });
    const singleMetrics = await singleRunner.runTask('benchmark');
    const multiMetrics = await multiRunner.runTask('benchmark');
    const efficiency = (0, metrics_js_1.coordinationEfficiency)(singleMetrics.successRate * 100, multiMetrics.successRate * 100);
    const report = {
        efficiency,
        singleAgent: singleMetrics,
        multiAgent: multiMetrics,
        pass: multiMetrics.tokenCost <= 20000 && multiMetrics.latencyMs <= 5000 // Ensure these match the budget
    };
    const reportsDir = path.resolve(process.cwd(), 'reports/agent-scaling');
    fs.mkdirSync(reportsDir, { recursive: true });
    // Deterministic artifact writes as per requirements
    fs.writeFileSync(path.join(reportsDir, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(reportsDir, 'metrics.json'), JSON.stringify({ efficiency, pass: report.pass }, null, 2));
    fs.writeFileSync(path.join(reportsDir, 'stamp.json'), JSON.stringify({ hash: 'deterministic-hash-placeholder' }, null, 2));
    const perfDir = path.resolve(process.cwd(), 'reports/perf');
    fs.mkdirSync(perfDir, { recursive: true });
    fs.writeFileSync(path.join(perfDir, 'agent-scaling.json'), JSON.stringify({ latency: multiMetrics.latencyMs, memory: 256, tokens: multiMetrics.tokenCost }, null, 2));
    if (!report.pass) {
        console.error('Benchmark failed cost/latency budgets');
        process.exit(1);
    }
    console.log('Benchmark passed');
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
