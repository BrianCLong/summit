"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbPoolUsage = exports.dbPoolAcquisitionLatency = exports.backupSize = exports.backupDuration = exports.circuitBreakerState = exports.dbConnectionErrors = exports.dbPoolWaiting = exports.dbPoolIdle = exports.dbPoolSize = void 0;
const prom_client_1 = require("prom-client");
exports.dbPoolSize = new prom_client_1.Gauge({
    name: 'db_pool_size',
    help: 'Current size of the database connection pool',
    labelNames: ['database', 'type'],
});
exports.dbPoolIdle = new prom_client_1.Gauge({
    name: 'db_pool_idle',
    help: 'Number of idle connections in the pool',
    labelNames: ['database', 'type'],
});
exports.dbPoolWaiting = new prom_client_1.Gauge({
    name: 'db_pool_waiting',
    help: 'Number of requests waiting for a connection',
    labelNames: ['database', 'type'],
});
exports.dbConnectionErrors = new prom_client_1.Counter({
    name: 'db_connection_errors_total',
    help: 'Total number of database connection errors',
    labelNames: ['database', 'error_type'],
});
exports.circuitBreakerState = new prom_client_1.Gauge({
    name: 'db_circuit_breaker_state',
    help: 'State of the circuit breaker (0=closed, 1=half-open, 2=open)',
    labelNames: ['database'],
});
exports.backupDuration = new prom_client_1.Histogram({
    name: 'backup_duration_seconds',
    help: 'Duration of backup operations',
    labelNames: ['type', 'status'],
});
exports.backupSize = new prom_client_1.Gauge({
    name: 'backup_size_bytes',
    help: 'Size of the backup artifact',
    labelNames: ['type'],
});
exports.dbPoolAcquisitionLatency = new prom_client_1.Histogram({
    name: 'db_pool_acquisition_latency_seconds',
    help: 'Time taken to acquire a connection from the pool',
    labelNames: ['database'],
});
exports.dbPoolUsage = new prom_client_1.Gauge({
    name: 'db_pool_usage',
    help: 'Current usage of the database connection pool',
    labelNames: ['database'],
});
