"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationOrchestrator = void 0;
const IdempotencyService_js_1 = require("./IdempotencyService.js");
const ValidationService_js_1 = require("./ValidationService.js");
const MockMigrationConnector_js_1 = require("./connectors/MockMigrationConnector.js");
const MockMigrationDestination_js_1 = require("./destinations/MockMigrationDestination.js");
const pino_1 = __importDefault(require("pino"));
// @ts-ignore
const logger = (0, pino_1.default)({ name: 'MigrationOrchestrator' });
class MigrationOrchestrator {
    idempotencyService;
    validationService;
    destination;
    constructor() {
        this.idempotencyService = new IdempotencyService_js_1.IdempotencyService();
        this.validationService = new ValidationService_js_1.ValidationService();
        this.destination = new MockMigrationDestination_js_1.MockMigrationDestination();
    }
    async runMigration(config) {
        const startedAt = new Date();
        const result = {
            migrationId: config.id,
            status: 'IN_PROGRESS',
            recordsProcessed: 0,
            recordsSuccess: 0,
            recordsFailed: 0,
            recordsSkipped: 0,
            errors: [],
            startedAt,
            dryRun: config.dryRun || false,
        };
        const ctx = {
            tenantId: config.tenantId,
            pipelineKey: `migration-${config.id}`,
            migrationId: config.id,
            dryRun: config.dryRun || false,
            mappings: config.mappings || {},
            logger,
            correlationId: `mig-${config.id}-${Date.now()}`
        };
        try {
            logger.info({ migrationId: config.id, type: config.sourceType }, 'Starting migration');
            // 1. Initialize Source
            const source = this.getConnector(config);
            let cursor = null;
            let hasMore = true;
            while (hasMore) {
                // 2. Fetch Batch
                let batch;
                try {
                    batch = await source.fetchBatch(ctx, cursor);
                }
                catch (e) {
                    result.errors.push({ stage: 'FETCH', message: e.message });
                    result.status = 'FAILED';
                    break;
                }
                const rawRecords = batch.data.records;
                if (!batch.data.nextCursor || batch.data.nextCursor === 'DONE') {
                    hasMore = false;
                }
                else {
                    cursor = batch.data.nextCursor;
                }
                if (rawRecords.length === 0)
                    continue;
                for (const record of rawRecords) {
                    result.recordsProcessed++;
                    const recordId = record.id || record.Id || record.ID;
                    try {
                        // 3. Check Idempotency
                        if (recordId && await this.idempotencyService.hasProcessed(ctx, recordId)) {
                            result.recordsSkipped++;
                            continue;
                        }
                        // 4. Validate
                        const validation = await this.validationService.validateRecord(ctx, record);
                        if (!validation.valid) {
                            result.recordsFailed++;
                            result.errors.push({
                                recordId,
                                stage: 'VALIDATION',
                                message: validation.errors.join(', '),
                                details: record
                            });
                            continue;
                        }
                        // 5. Map & Transform (Placeholder)
                        // const mapped = this.mapRecord(record, config.mappings);
                        // 6. Write (or simulate if dry-run)
                        // Note: Batching writes would be more efficient in production
                        if (!ctx.dryRun) {
                            await this.destination.write(ctx, [record]);
                            if (recordId)
                                await this.idempotencyService.markProcessed(ctx, recordId);
                        }
                        result.recordsSuccess++;
                    }
                    catch (e) {
                        result.recordsFailed++;
                        result.errors.push({ recordId, stage: 'PROCESS', message: e.message });
                    }
                }
            }
            if (result.status === 'IN_PROGRESS') {
                result.status = result.errors.length > 0 ? 'PARTIAL' : 'COMPLETED';
            }
            result.completedAt = new Date();
            logger.info({ migrationId: config.id, status: result.status }, 'Migration completed');
        }
        catch (error) {
            logger.error({ migrationId: config.id, error }, 'Migration failed');
            result.status = 'FAILED';
            result.errors.push({ stage: 'FATAL', message: error.message });
            result.completedAt = new Date();
        }
        return result;
    }
    getConnector(config) {
        switch (config.sourceType) {
            case 'salesforce':
            case 'mock':
                return new MockMigrationConnector_js_1.MockMigrationConnector(config.sourceConfig);
            // Add other connectors here
            default:
                throw new Error(`Unsupported source type: ${config.sourceType}`);
        }
    }
}
exports.MigrationOrchestrator = MigrationOrchestrator;
