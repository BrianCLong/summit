import client from 'prom-client';
export const riskScoreDist = new client.Histogram({
    name: 'risk_score_distribution',
    help: 'Risk score distribution',
    buckets: [0, 0.25, 0.5, 0.75, 1]
});
export const riskRecomputeLatency = new client.Histogram({
    name: 'risk_recompute_latency_ms',
    help: 'Latency of risk recompute',
    buckets: [10, 50, 100, 500, 1000]
});
//# sourceMappingURL=risk_metrics.js.map