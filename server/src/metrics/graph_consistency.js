"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairOperationsTotal = exports.consistencyCheckDuration = exports.propertyMismatchCount = exports.missingNodesCount = exports.orphanNodesCount = exports.graphDriftCount = void 0;
// @ts-nocheck
const prom_client_1 = require("prom-client");
const metrics_js_1 = require("../utils/metrics.js");
exports.graphDriftCount = (0, metrics_js_1.getOrRegisterMetric)('graph_drift_count', prom_client_1.Gauge, {
    name: 'graph_drift_count',
    help: 'Total number of inconsistencies detected between Postgres and Neo4j',
    labelNames: ['type', 'severity'],
});
exports.orphanNodesCount = (0, metrics_js_1.getOrRegisterMetric)('graph_orphan_nodes_count', prom_client_1.Gauge, {
    name: 'graph_orphan_nodes_count',
    help: 'Number of nodes in Neo4j that do not exist in Postgres',
    labelNames: ['entity_type'],
});
exports.missingNodesCount = (0, metrics_js_1.getOrRegisterMetric)('graph_missing_nodes_count', prom_client_1.Gauge, {
    name: 'graph_missing_nodes_count',
    help: 'Number of entities in Postgres that do not exist in Neo4j',
    labelNames: ['entity_type'],
});
exports.propertyMismatchCount = (0, metrics_js_1.getOrRegisterMetric)('graph_property_mismatch_count', prom_client_1.Gauge, {
    name: 'graph_property_mismatch_count',
    help: 'Number of entities with property mismatches between Postgres and Neo4j',
    labelNames: ['entity_type'],
});
exports.consistencyCheckDuration = (0, metrics_js_1.getOrRegisterMetric)('graph_consistency_check_duration_seconds', prom_client_1.Gauge, {
    name: 'graph_consistency_check_duration_seconds',
    help: 'Duration of the last graph consistency check in seconds',
});
exports.repairOperationsTotal = (0, metrics_js_1.getOrRegisterMetric)('graph_repair_operations_total', prom_client_1.Counter, {
    name: 'graph_repair_operations_total',
    help: 'Total number of repair operations performed',
    labelNames: ['operation_type', 'status'], // operation_type: 'create_node', 'delete_orphan', 'sync_props'
});
