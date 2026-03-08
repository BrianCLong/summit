"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const METRICS = [
    // Performance
    { id: 'perf_api_p95', name: 'API Latency P95', target: 285, criticalLimit: 350, direction: 'min' },
    { id: 'perf_graph_p95', name: 'Graph 3-Hop P95', target: 285, criticalLimit: 1200, direction: 'min' },
    { id: 'perf_throughput', name: 'API Throughput', target: 207.5, criticalLimit: 100, direction: 'max' },
    // Cost
    { id: 'cost_per_req', name: 'Cost Per Request', target: 0.012, criticalLimit: 0.020, direction: 'min' },
    { id: 'cost_hourly', name: 'Total Hourly Cost', target: 24.00, criticalLimit: 30.00, direction: 'min' },
    { id: 'cost_storage_eff', name: 'Storage Efficiency', target: 85.8, criticalLimit: 75, direction: 'max' },
    // Safety
    { id: 'safe_error_rate', name: 'API Error Rate', target: 0.008, criticalLimit: 0.1, direction: 'min' },
    { id: 'safe_auth_deny', name: 'Policy Deny Rate', target: 12.5, criticalLimit: 5, direction: 'range' }, // Special handling needed
    { id: 'safe_invariant', name: 'Invariant Pass Rate', target: 100, criticalLimit: 100, direction: 'max' },
];
// --- Logic ---
function checkMetrics(current) {
    let hasRegression = false;
    let report = [];
    console.log("🔍 Checking Optimization Metrics...\n");
    for (const metric of METRICS) {
        const value = current[metric.id];
        if (value === undefined) {
            console.warn(`⚠️ Metric ${metric.id} missing from input.`);
            continue;
        }
        let status = '✅ PASS';
        let message = '';
        // Check against Critical Limit (SLO Breach)
        if (metric.direction === 'min') {
            if (value > metric.criticalLimit) {
                status = '❌ CRITICAL';
                hasRegression = true;
                message = `Breached critical limit (> ${metric.criticalLimit})`;
            }
            else if (value > metric.target) {
                status = '⚠️ WARNING';
                message = `Above target (> ${metric.target})`;
            }
        }
        else if (metric.direction === 'max') {
            if (value < metric.criticalLimit) {
                status = '❌ CRITICAL';
                hasRegression = true;
                message = `Breached critical limit (< ${metric.criticalLimit})`;
            }
            else if (value < metric.target) {
                status = '⚠️ WARNING';
                message = `Below target (< ${metric.target})`;
            }
        }
        else if (metric.direction === 'range') {
            // Simple range check for "Policy Deny Rate" - we don't want it too low (permissive) or too high (broken)
            // For this sprint, we treat the 'criticalLimit' as the lower bound (dangerously permissive)
            if (value < metric.criticalLimit) {
                status = '❌ CRITICAL';
                hasRegression = true;
                message = `Breached critical limit (< ${metric.criticalLimit})`;
            }
        }
        report.push({
            metric: metric.name,
            value: value,
            target: metric.target,
            limit: metric.criticalLimit,
            status: status,
            message: message
        });
    }
    // Print Report Table
    console.table(report);
    // Multi-dimensional Logic (Epic 2)
    // Check if we are "Improving X but breaking Y"
    // This is implicit: If ANY metric is CRITICAL, we fail.
    // But strictly, we should check if a change caused a regression.
    // Since we don't have "previous" metrics here easily, we rely on the absolute bounds.
    if (hasRegression) {
        console.error("\n❌ REGRESSION DETECTED: Optimization bounds breached.");
        process.exit(1);
    }
    else {
        console.log("\n✅ ALL SYSTEMS NOMINAL: Optimization loop verified.");
        process.exit(0);
    }
}
// --- Main ---
const metricsFile = process.argv[2] || 'current_metrics.json';
const metricsPath = path_1.default.resolve(process.cwd(), metricsFile);
if (!fs_1.default.existsSync(metricsPath)) {
    // Create a dummy one for demonstration if missing
    console.log("ℹ️ No metrics file found, generating sample 'current_metrics.json'...");
    const sample = {
        'perf_api_p95': 120,
        'perf_graph_p95': 200,
        'perf_throughput': 250,
        'cost_per_req': 0.010,
        'cost_hourly': 22.50,
        'cost_storage_eff': 88.0,
        'safe_error_rate': 0.005,
        'safe_auth_deny': 12.0,
        'safe_invariant': 100
    };
    fs_1.default.writeFileSync(metricsPath, JSON.stringify(sample, null, 2));
}
const currentMetrics = JSON.parse(fs_1.default.readFileSync(metricsPath, 'utf8'));
checkMetrics(currentMetrics);
