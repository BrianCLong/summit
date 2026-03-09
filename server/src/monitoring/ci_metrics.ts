import * as promClient from 'prom-client';
import { register } from './metrics.js';

export const ciRuntimeMinutes = new promClient.Histogram({
    name: 'ci_runtime_minutes',
    help: 'CI execution runtime duration in minutes',
    labelNames: ['pipeline', 'status'],
    buckets: [1, 2, 5, 10, 15, 20, 30]
});
register.registerMetric(ciRuntimeMinutes);

export const ciTestFlakes = new promClient.Counter({
    name: 'ci_test_flakes_total',
    help: 'Total number of flaky tests detected in CI',
    labelNames: ['suite', 'test_name']
});
register.registerMetric(ciTestFlakes);

export const mergeQueueThroughput = new promClient.Counter({
    name: 'merge_queue_prs_merged_total',
    help: 'Total number of PRs successfully processed through the merge queue',
    labelNames: ['repository', 'base_branch']
});
register.registerMetric(mergeQueueThroughput);
