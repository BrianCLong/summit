"use strict";
/**
 * Load Test for Media Pipeline Service
 *
 * Run with: pnpm test:load
 */
Object.defineProperty(exports, "__esModule", { value: true });
const pipeline_service_js_1 = require("../../src/services/pipeline.service.js");
const registry_js_1 = require("../../src/providers/registry.js");
const hash_js_1 = require("../../src/utils/hash.js");
const time_js_1 = require("../../src/utils/time.js");
const createMockMediaAsset = () => ({
    id: (0, hash_js_1.generateId)(),
    type: 'audio',
    format: 'mp3',
    status: 'pending',
    metadata: {
        filename: 'test.mp3',
        mimeType: 'audio/mpeg',
        size: 1024 * 1024,
        duration: 30000, // 30 seconds
    },
    storage: {
        provider: 'local',
        key: `test-${(0, hash_js_1.generateId)()}`,
    },
    checksum: (0, hash_js_1.generateId)(),
    provenance: {
        sourceId: 'test',
        sourceType: 'upload',
        ingestedAt: (0, time_js_1.now)(),
        ingestedBy: 'load-test',
        transformChain: [],
        originalChecksum: (0, hash_js_1.generateId)(),
    },
    retryCount: 0,
    createdAt: (0, time_js_1.now)(),
});
async function runSingleRequest(pipelineService) {
    const mediaAsset = createMockMediaAsset();
    const startTime = Date.now();
    await pipelineService.process(mediaAsset, {
        skipGraphSync: true,
        skipSpacetimeSync: true,
    });
    return Date.now() - startTime;
}
async function runConcurrentBatch(pipelineService, batchSize) {
    const promises = Array(batchSize)
        .fill(null)
        .map(() => runSingleRequest(pipelineService).catch(() => -1));
    const results = await Promise.all(promises);
    const latencies = results.filter((r) => r >= 0);
    const errors = results.filter((r) => r < 0).length;
    return { latencies, errors };
}
function calculatePercentile(sortedLatencies, percentile) {
    const index = Math.ceil((percentile / 100) * sortedLatencies.length) - 1;
    return sortedLatencies[Math.max(0, index)];
}
async function runLoadTest(config) {
    console.log('Initializing provider registry...');
    await registry_js_1.providerRegistry.initialize();
    const pipelineService = new pipeline_service_js_1.PipelineService();
    const allLatencies = [];
    let totalErrors = 0;
    // Warmup
    console.log(`Running ${config.warmupRequests} warmup requests...`);
    for (let i = 0; i < config.warmupRequests; i++) {
        await runSingleRequest(pipelineService);
    }
    console.log(`Starting load test with ${config.totalRequests} requests at concurrency ${config.concurrency}...`);
    const testStartTime = Date.now();
    const batches = Math.ceil(config.totalRequests / config.concurrency);
    for (let i = 0; i < batches; i++) {
        const batchSize = Math.min(config.concurrency, config.totalRequests - i * config.concurrency);
        const { latencies, errors } = await runConcurrentBatch(pipelineService, batchSize);
        allLatencies.push(...latencies);
        totalErrors += errors;
        const progress = Math.round(((i + 1) / batches) * 100);
        process.stdout.write(`\rProgress: ${progress}% (${allLatencies.length}/${config.totalRequests})`);
    }
    const totalDurationMs = Date.now() - testStartTime;
    console.log('\n');
    // Calculate statistics
    const sortedLatencies = [...allLatencies].sort((a, b) => a - b);
    const avgLatencyMs = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
    const result = {
        totalRequests: config.totalRequests,
        successfulRequests: allLatencies.length,
        failedRequests: totalErrors,
        totalDurationMs,
        avgLatencyMs: Math.round(avgLatencyMs),
        p50LatencyMs: calculatePercentile(sortedLatencies, 50),
        p95LatencyMs: calculatePercentile(sortedLatencies, 95),
        p99LatencyMs: calculatePercentile(sortedLatencies, 99),
        requestsPerSecond: Math.round((allLatencies.length / totalDurationMs) * 1000 * 100) / 100,
    };
    return result;
}
function printResults(result) {
    console.log('='.repeat(50));
    console.log('LOAD TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Requests:      ${result.totalRequests}`);
    console.log(`Successful:          ${result.successfulRequests}`);
    console.log(`Failed:              ${result.failedRequests}`);
    console.log(`Total Duration:      ${(0, time_js_1.formatDuration)(result.totalDurationMs)}`);
    console.log('-'.repeat(50));
    console.log(`Avg Latency:         ${result.avgLatencyMs}ms`);
    console.log(`P50 Latency:         ${result.p50LatencyMs}ms`);
    console.log(`P95 Latency:         ${result.p95LatencyMs}ms`);
    console.log(`P99 Latency:         ${result.p99LatencyMs}ms`);
    console.log('-'.repeat(50));
    console.log(`Requests/sec:        ${result.requestsPerSecond}`);
    console.log('='.repeat(50));
}
// Run the load test
const config = {
    concurrency: parseInt(process.env.LOAD_TEST_CONCURRENCY || '5', 10),
    totalRequests: parseInt(process.env.LOAD_TEST_REQUESTS || '50', 10),
    warmupRequests: parseInt(process.env.LOAD_TEST_WARMUP || '5', 10),
};
runLoadTest(config)
    .then(printResults)
    .catch((error) => {
    console.error('Load test failed:', error);
    process.exit(1);
});
