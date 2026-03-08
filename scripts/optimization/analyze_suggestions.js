"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load the shared metrics config logic (duplicating here for simplicity in this env,
// normally would share a module)
const metricsPath = path_1.default.resolve(process.cwd(), 'current_metrics.json');
const currentMetrics = JSON.parse(fs_1.default.readFileSync(metricsPath, 'utf8'));
const suggestions = [];
// --- Analysis Heuristics ---
// 1. Performance Surplus -> Cost Opportunity
// If API Latency is very low (< 50% of target 285ms = 142.5ms), we might be over-provisioned.
if (currentMetrics['perf_api_p95'] < 142.5) {
    suggestions.push({
        area: 'Cost',
        action: 'Reduce replica count or CPU limits on API service.',
        impact: 'Estimated 10-20% cost reduction.',
        risk: 'Potential latency increase; monitor p95 closely.'
    });
}
// 2. Cost Pressure -> Performance Tuning
// If Hourly Cost is near limit (> 90% of 24.00 = 21.60), we need efficiency.
if (currentMetrics['cost_hourly'] > 21.60) {
    suggestions.push({
        area: 'Performance',
        action: 'Enable response caching for read-heavy endpoints.',
        impact: 'Reduce compute usage and cost.',
        risk: 'Stale data; ensure proper cache invalidation.'
    });
}
// 3. Safety Check -> Policy Refinement
// If Policy Deny Rate is very high (> 20%), we might be blocking legitimate traffic or under attack.
if (currentMetrics['safe_auth_deny'] > 20) {
    suggestions.push({
        area: 'Safety',
        action: 'Audit OPA deny logs for false positives.',
        impact: 'Improve user experience and success rates.',
        risk: 'Inadvertently allowing malicious traffic.'
    });
}
// If Policy Deny Rate is extremely low (< 1%), maybe policies are effectively disabled?
else if (currentMetrics['safe_auth_deny'] < 1) {
    suggestions.push({
        area: 'Safety',
        action: 'Verify OPA policies are actually enforcing.',
        impact: 'Ensure security posture.',
        risk: 'None (verification only).'
    });
}
// 4. Storage Efficiency
if (currentMetrics['cost_storage_eff'] < 80) {
    suggestions.push({
        area: 'Cost',
        action: 'Run compact/GC on Neo4j/Postgres storage.',
        impact: 'Reclaim disk space.',
        risk: 'Temporary I/O spike during operation.'
    });
}
// --- Output ---
console.log("# 🤖 Automated Optimization Suggestions\n");
if (suggestions.length === 0) {
    console.log("No high-confidence suggestions at this time.");
}
else {
    console.table(suggestions);
    // Also write to a file for CI/Dashboard consumption
    const reportPath = path_1.default.resolve(process.cwd(), 'optimization_suggestions.json');
    fs_1.default.writeFileSync(reportPath, JSON.stringify(suggestions, null, 2));
    console.log(`\nReport saved to ${reportPath}`);
}
