"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const MigrationOrchestrator_js_1 = require("../MigrationOrchestrator.js");
(0, globals_1.describe)('MigrationOrchestrator', () => {
    let orchestrator;
    (0, globals_1.beforeEach)(() => {
        orchestrator = new MigrationOrchestrator_js_1.MigrationOrchestrator();
    });
    (0, globals_1.it)('should run a dry run migration successfully', async () => {
        const config = {
            id: 'test-mig-1',
            tenantId: 'tenant-1',
            sourceType: 'mock',
            sourceConfig: { recordCount: 20, batchSize: 10 },
            dryRun: true
        };
        const result = await orchestrator.runMigration(config);
        (0, globals_1.expect)(result.status).toBe('COMPLETED');
        (0, globals_1.expect)(result.dryRun).toBe(true);
        // Based on the mock connector returning 10 records per batch for 2 batches
        (0, globals_1.expect)(result.recordsProcessed).toBe(20);
        (0, globals_1.expect)(result.recordsSuccess).toBe(20);
        (0, globals_1.expect)(result.errors).toHaveLength(0);
    });
    (0, globals_1.it)('should handle idempotency', async () => {
        const config = {
            id: 'test-mig-2',
            tenantId: 'tenant-1',
            sourceType: 'mock',
            sourceConfig: { recordCount: 20, batchSize: 10 },
            dryRun: false
        };
        // First run
        await orchestrator.runMigration(config);
        // Second run
        const result = await orchestrator.runMigration(config);
        (0, globals_1.expect)(result.status).toBe('COMPLETED');
        (0, globals_1.expect)(result.recordsProcessed).toBe(20);
        (0, globals_1.expect)(result.recordsSkipped).toBe(20); // Should skip all since they were processed
    });
});
