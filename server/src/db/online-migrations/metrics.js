"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paritySamplesCounter = exports.parityMismatchCounter = exports.dualWriteDurationSeconds = exports.backfillProgressGauge = exports.backfillDurationSeconds = exports.backfillProcessedCounter = exports.migrationMetricsRegistry = void 0;
exports.resetMigrationMetrics = resetMigrationMetrics;
const prom_client_1 = require("prom-client");
exports.migrationMetricsRegistry = new prom_client_1.Registry();
exports.backfillProcessedCounter = new prom_client_1.Counter({
    name: 'online_migration_backfill_processed_total',
    help: 'Rows processed by online migration backfill jobs',
    labelNames: ['migration', 'job'],
    registers: [exports.migrationMetricsRegistry],
});
exports.backfillDurationSeconds = new prom_client_1.Histogram({
    name: 'online_migration_backfill_duration_seconds',
    help: 'Time spent per backfill chunk',
    labelNames: ['migration', 'job'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [exports.migrationMetricsRegistry],
});
exports.backfillProgressGauge = new prom_client_1.Gauge({
    name: 'online_migration_backfill_processed_rows',
    help: 'Cumulative processed rows for the backfill job',
    labelNames: ['migration', 'job'],
    registers: [exports.migrationMetricsRegistry],
});
exports.dualWriteDurationSeconds = new prom_client_1.Histogram({
    name: 'online_migration_dual_write_duration_seconds',
    help: 'Latency for dual-write operations during expand/contract',
    labelNames: ['migration', 'operation'],
    buckets: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [exports.migrationMetricsRegistry],
});
exports.parityMismatchCounter = new prom_client_1.Counter({
    name: 'online_migration_parity_mismatches_total',
    help: 'Parity mismatches detected between old and new representations',
    labelNames: ['migration'],
    registers: [exports.migrationMetricsRegistry],
});
exports.paritySamplesCounter = new prom_client_1.Counter({
    name: 'online_migration_parity_samples_total',
    help: 'Samples compared during parity checks',
    labelNames: ['migration'],
    registers: [exports.migrationMetricsRegistry],
});
function resetMigrationMetrics() {
    exports.migrationMetricsRegistry.resetMetrics();
}
