"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCostGuardTiles = buildCostGuardTiles;
function buildCostGuardTiles(input) {
    const latencyStatus = input.p95LatencyMs > input.sloTargetMs * 1.2
        ? 'breach'
        : input.p95LatencyMs > input.sloTargetMs
            ? 'warn'
            : 'ok';
    const killStatus = input.killCount > 0 ? 'warn' : 'ok';
    const topReason = Object.entries(input.killReasons).sort((a, b) => b[1] - a[1])[0];
    return [
        {
            id: 'p95-latency',
            label: 'p95 Query Latency',
            value: Number(input.p95LatencyMs.toFixed(0)),
            unit: 'ms',
            status: latencyStatus,
            hint: `Target ${input.sloTargetMs} ms`,
        },
        {
            id: 'kill-count',
            label: 'Cost Guard Kills',
            value: input.killCount,
            unit: 'kills',
            status: killStatus,
            hint: topReason ? `Top reason: ${topReason[0]}` : 'No kill events',
        },
    ];
}
