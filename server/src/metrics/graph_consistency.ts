import { Gauge, Counter } from 'prom-client';
import { getOrRegisterMetric } from '../utils/metrics';

export const graphDriftCount = getOrRegisterMetric(
  'graph_drift_count',
  Gauge,
  {
    name: 'graph_drift_count',
    help: 'Total number of inconsistencies detected between Postgres and Neo4j',
    labelNames: ['type', 'severity'],
  }
);

export const orphanNodesCount = getOrRegisterMetric(
  'graph_orphan_nodes_count',
  Gauge,
  {
    name: 'graph_orphan_nodes_count',
    help: 'Number of nodes in Neo4j that do not exist in Postgres',
    labelNames: ['entity_type'],
  }
);

export const missingNodesCount = getOrRegisterMetric(
  'graph_missing_nodes_count',
  Gauge,
  {
    name: 'graph_missing_nodes_count',
    help: 'Number of entities in Postgres that do not exist in Neo4j',
    labelNames: ['entity_type'],
  }
);

export const propertyMismatchCount = getOrRegisterMetric(
  'graph_property_mismatch_count',
  Gauge,
  {
    name: 'graph_property_mismatch_count',
    help: 'Number of entities with property mismatches between Postgres and Neo4j',
    labelNames: ['entity_type'],
  }
);

export const consistencyCheckDuration = getOrRegisterMetric(
  'graph_consistency_check_duration_seconds',
  Gauge,
  {
    name: 'graph_consistency_check_duration_seconds',
    help: 'Duration of the last graph consistency check in seconds',
  }
);

export const repairOperationsTotal = getOrRegisterMetric(
  'graph_repair_operations_total',
  Counter,
  {
    name: 'graph_repair_operations_total',
    help: 'Total number of repair operations performed',
    labelNames: ['operation_type', 'status'], // operation_type: 'create_node', 'delete_orphan', 'sync_props'
  }
);
