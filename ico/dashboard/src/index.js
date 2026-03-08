"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDashboardState = buildDashboardState;
exports.computeUtilizationForecast = computeUtilizationForecast;
function buildDashboardState(plan) {
    const generatedAt = typeof plan.metadata?.generated_at === 'string'
        ? plan.metadata.generated_at
        : undefined;
    const endpoints = plan.plans.map((endpointPlan) => {
        const id = `${endpointPlan.model}:${endpointPlan.endpoint}`;
        const _baselineCapacity = endpointPlan.baseline.replicas * endpointPlan.baseline.qps_capacity;
        const plannedCapacity = endpointPlan.autoscaling.target_replicas * endpointPlan.quantization.qps_capacity;
        const capacityMargin = plannedCapacity > 0
            ? (plannedCapacity - endpointPlan.autoscaling.target_replicas * endpointPlan.quantization.qps_capacity * endpointPlan.autoscaling.target_utilization) / plannedCapacity
            : 0;
        return {
            id,
            model: endpointPlan.model,
            endpoint: endpointPlan.endpoint,
            baselineCost: endpointPlan.baseline.total_cost,
            plannedCost: endpointPlan.planned_cost,
            savingsPct: safeDivision(endpointPlan.baseline.total_cost - endpointPlan.planned_cost, endpointPlan.baseline.total_cost),
            latencyHeadroomMs: endpointPlan.latency_headroom_ms,
            accuracyHeadroom: endpointPlan.accuracy_headroom,
            quantizationStrategy: endpointPlan.quantization.strategy,
            targetReplicas: endpointPlan.autoscaling.target_replicas,
            capacityMarginPct: Math.round(capacityMargin * 1000) / 10,
        };
    });
    const savingsByEndpoint = endpoints.map((endpoint) => ({
        label: endpoint.id,
        value: Math.round(endpoint.savingsPct * 1000) / 10,
    }));
    const headroomByEndpoint = endpoints.map((endpoint) => ({
        label: endpoint.id,
        value: Math.round(endpoint.latencyHeadroomMs * 100) / 100,
    }));
    const utilizationForecast = computeUtilizationForecast(plan);
    return {
        generatedAt,
        totals: {
            baselineCost: plan.summary.total_baseline_cost,
            plannedCost: plan.summary.total_planned_cost,
            savingsPct: plan.summary.total_savings_pct,
        },
        endpoints,
        charts: {
            savingsByEndpoint,
            headroomByEndpoint,
            utilizationForecast,
        },
    };
}
function computeUtilizationForecast(plan, multipliers = [0.5, 1, 1.5]) {
    const points = [];
    for (const multiplier of multipliers) {
        let totalCapacity = 0;
        let totalLoad = 0;
        for (const endpoint of plan.plans) {
            const capacityPerReplica = endpoint.quantization.qps_capacity;
            totalCapacity += capacityPerReplica * endpoint.autoscaling.target_replicas;
            totalLoad += endpoint.quantization.qps_capacity * endpoint.autoscaling.target_replicas * multiplier;
        }
        const utilization = totalCapacity > 0 ? totalLoad / totalCapacity : 0;
        points.push({
            label: `${Math.round(multiplier * 100)}% load`,
            value: Math.round(utilization * 1000) / 10,
        });
    }
    return points;
}
function safeDivision(numerator, denominator) {
    if (Math.abs(denominator) < 1e-9) {
        return 0;
    }
    return numerator / denominator;
}
