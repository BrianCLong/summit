"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const date_fns_1 = require("date-fns");
function parseArgs(argv) {
    let statePath = '../../services/agsm/state/metrics.json';
    let watch = false;
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--state' && argv[i + 1]) {
            statePath = argv[i + 1];
            i += 1;
        }
        else if (arg === '--watch') {
            watch = true;
        }
    }
    return {
        statePath: (0, node_path_1.resolve)(process.cwd(), statePath),
        watch,
    };
}
function loadState(path) {
    try {
        const data = (0, node_fs_1.readFileSync)(path, 'utf-8');
        if (!data.trim()) {
            return undefined;
        }
        return JSON.parse(data);
    }
    catch (error) {
        return undefined;
    }
}
function percentage(value) {
    return `${(value * 100).toFixed(1)}%`;
}
function render(state, path) {
    console.clear();
    console.log('Ambient Governance Synthetic Monitoring');
    console.log('='.repeat(48));
    if (!state) {
        console.log(`No metrics available yet at ${path}`);
        return;
    }
    const updated = new Date(state.lastUpdated);
    const ago = Number.isNaN(updated.getTime())
        ? 'unknown'
        : `${(0, date_fns_1.formatDistanceToNow)(updated, { addSuffix: true })}`;
    console.log(`Window: last ${state.windowMinutes.toFixed(1)} minutes`);
    console.log(`Updated: ${ago}`);
    console.log('');
    console.log('SLIs');
    console.log('-'.repeat(48));
    console.log(`Success rate: ${percentage(state.aggregates.successRate)} (${state.aggregates.successes}/${state.aggregates.total})`);
    console.log(`Failures: ${state.aggregates.failures}`);
    console.log('');
    console.log('Recent Probes');
    console.log('-'.repeat(48));
    if (state.probes.length === 0) {
        console.log('No probe executions in window.');
    }
    else {
        state.probes
            .slice(-10)
            .reverse()
            .forEach((probe) => {
            const status = probe.success ? 'PASS' : 'FAIL';
            const icon = probe.success ? '✅' : '❌';
            const suffix = probe.canary ? ' (canary)' : '';
            console.log(`${icon} ${status.padEnd(4)} | ${probe.name} [${probe.scenario}]${suffix} – ${probe.latencyMs}ms`);
            if (!probe.success && probe.error) {
                console.log(`    reason: ${probe.error}`);
            }
        });
    }
    console.log('');
    console.log('Alerts');
    console.log('-'.repeat(48));
    if (state.alerts.length === 0) {
        console.log('No alerts in window.');
    }
    else {
        state.alerts
            .slice(-5)
            .reverse()
            .forEach((alert) => {
            const when = new Date(alert.timestamp);
            const whenText = Number.isNaN(when.getTime())
                ? 'unknown'
                : (0, date_fns_1.formatDistanceToNow)(when, { addSuffix: true });
            console.log(`${alert.level.toUpperCase().padEnd(8)} ${whenText} :: ${alert.message}`);
        });
    }
}
async function main() {
    const options = parseArgs(process.argv.slice(2));
    const renderState = () => {
        const state = loadState(options.statePath);
        render(state, options.statePath);
    };
    renderState();
    if (options.watch) {
        (0, node_fs_1.watchFile)(options.statePath, { interval: 1500 }, () => {
            renderState();
        });
    }
}
void main();
