import { Counter, Histogram } from 'prom-client';
export const queryMetrics = {
    plans: new Counter({ name: 'hunting_plan_total', help: 'Number of copilot plans' }),
    executions: new Counter({ name: 'hunting_execution_total', help: 'Executed hunts' }),
    timeouts: new Counter({ name: 'hunting_timeouts_total', help: 'Timed out hunts' }),
    rows: new Histogram({ name: 'hunting_rows', help: 'Rows returned', buckets: [10, 100, 1000] }),
    killed: new Counter({ name: 'hunting_killed_total', help: 'Killed queries' })
};
export function registerQueryMetrics(register) {
    Object.values(queryMetrics).forEach((m) => register.registerMetric(m));
}
//# sourceMappingURL=query_metrics.js.map