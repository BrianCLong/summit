"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const er_engine_1 = require("../../src/core/er-engine");
(0, globals_1.describe)('Performance Benchmarks', () => {
    let engine;
    (0, globals_1.beforeEach)(() => {
        engine = new er_engine_1.EREngine();
    });
    /**
     * Generate test entities
     */
    function generateEntities(count, tenantId) {
        const entities = [];
        for (let i = 0; i < count; i++) {
            entities.push({
                id: `entity-${i}`,
                type: 'person',
                name: `Person ${i}`,
                tenantId,
                attributes: {
                    email: `person${i}@example.com`,
                    age: 20 + (i % 50),
                },
                deviceIds: [`device-${i % 10}`],
                accountIds: [`acct-${i % 5}`],
            });
            engine.storeEntity(entities[i]);
        }
        return entities;
    }
    (0, globals_1.describe)('Merge Operation Performance', () => {
        (0, globals_1.it)('should handle 100 merge operations per second', () => {
            const tenantId = 'perf-test-tenant';
            generateEntities(200, tenantId);
            const merges = [];
            for (let i = 0; i < 100; i++) {
                merges.push({
                    tenantId,
                    entityIds: [`entity-${i * 2}`, `entity-${i * 2 + 1}`],
                    actor: 'benchmark@example.com',
                    reason: 'Performance test',
                });
            }
            const startTime = Date.now();
            for (const mergeRequest of merges) {
                engine.merge(mergeRequest);
            }
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            const opsPerSecond = (100 / durationMs) * 1000;
            // Merge operations: ${opsPerSecond.toFixed(2)} ops/sec
            // Average time per merge: ${(durationMs / 100).toFixed(2)}ms
            // Target: at least 100 ops/sec = max 10ms per operation
            (0, globals_1.expect)(opsPerSecond).toBeGreaterThanOrEqual(100);
            (0, globals_1.expect)(durationMs / 100).toBeLessThanOrEqual(10);
        });
        (0, globals_1.it)('should handle batch merge operations efficiently', () => {
            const tenantId = 'batch-test-tenant';
            generateEntities(1000, tenantId);
            const startTime = Date.now();
            // Perform 500 merges
            for (let i = 0; i < 500; i++) {
                engine.merge({
                    tenantId,
                    entityIds: [`entity-${i * 2}`, `entity-${i * 2 + 1}`],
                    actor: 'batch@example.com',
                    reason: 'Batch test',
                });
            }
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            const opsPerSecond = (500 / durationMs) * 1000;
            // Batch merge: ${opsPerSecond.toFixed(2)} ops/sec
            (0, globals_1.expect)(opsPerSecond).toBeGreaterThanOrEqual(100);
        });
    });
    (0, globals_1.describe)('Candidate Finding Performance', () => {
        (0, globals_1.it)('should find candidates efficiently in large populations', () => {
            const tenantId = 'candidate-perf-test';
            const population = generateEntities(1000, tenantId);
            const testEntity = population[0];
            const startTime = Date.now();
            for (let i = 0; i < 50; i++) {
                engine.candidates({
                    tenantId,
                    entity: testEntity,
                    population,
                    topK: 10,
                });
            }
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            const avgTimeMs = durationMs / 50;
            // Average candidate search time: ${avgTimeMs.toFixed(2)}ms
            // Population size: ${population.length}
            // Should complete in reasonable time (< 100ms per search)
            (0, globals_1.expect)(avgTimeMs).toBeLessThan(100);
        });
        (0, globals_1.it)('should scale linearly with population size', () => {
            const tenantId = 'scaling-test';
            const sizes = [100, 500, 1000];
            const times = [];
            for (const size of sizes) {
                const population = generateEntities(size, tenantId);
                const testEntity = population[0];
                const startTime = Date.now();
                engine.candidates({
                    tenantId,
                    entity: testEntity,
                    population,
                    topK: 10,
                });
                const endTime = Date.now();
                times.push(endTime - startTime);
                // Population ${size}: ${times[times.length - 1]}ms
            }
            // Verify reasonable scaling
            // Time should increase but not quadratically
            const ratio = times[2] / times[0];
            (0, globals_1.expect)(ratio).toBeLessThan(20); // Should be roughly linear
        });
    });
    (0, globals_1.describe)('Memory and Storage Performance', () => {
        (0, globals_1.it)('should handle large audit logs efficiently', () => {
            const tenantId = 'audit-perf-test';
            generateEntities(200, tenantId);
            // Create 1000 merge operations
            for (let i = 0; i < 1000; i++) {
                engine.merge({
                    tenantId,
                    entityIds: [`entity-${i % 100}`, `entity-${(i + 1) % 100}`],
                    actor: 'audit-test@example.com',
                    reason: `Test ${i}`,
                });
            }
            const startTime = Date.now();
            const auditLog = engine.getAuditLog({
                tenantId,
                limit: 100,
            });
            const endTime = Date.now();
            const queryTime = endTime - startTime;
            // Audit log query time: ${queryTime}ms
            (0, globals_1.expect)(queryTime).toBeLessThan(50);
            (0, globals_1.expect)(auditLog.length).toBe(100);
        });
        (0, globals_1.it)('should retrieve statistics quickly', () => {
            const tenantId = 'stats-test';
            generateEntities(1000, tenantId);
            const startTime = Date.now();
            const stats = engine.getStats();
            const endTime = Date.now();
            // Stats retrieval: ${endTime - startTime}ms
            (0, globals_1.expect)(endTime - startTime).toBeLessThan(10);
            (0, globals_1.expect)(stats.entities).toBe(1000);
        });
    });
    (0, globals_1.describe)('Concurrent Operations', () => {
        (0, globals_1.it)('should handle concurrent merge requests', async () => {
            const tenantId = 'concurrent-test';
            generateEntities(200, tenantId);
            const mergePromises = [];
            const startTime = Date.now();
            for (let i = 0; i < 100; i++) {
                mergePromises.push(Promise.resolve().then(() => {
                    engine.merge({
                        tenantId,
                        entityIds: [`entity-${i * 2}`, `entity-${i * 2 + 1}`],
                        actor: 'concurrent@example.com',
                        reason: 'Concurrent test',
                    });
                }));
            }
            await Promise.all(mergePromises);
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            const opsPerSecond = (100 / durationMs) * 1000;
            // Concurrent merges: ${opsPerSecond.toFixed(2)} ops/sec
            (0, globals_1.expect)(opsPerSecond).toBeGreaterThanOrEqual(100);
        });
    });
});
