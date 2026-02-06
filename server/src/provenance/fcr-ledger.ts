import { provenanceLedger } from './ledger.js';
import { FcrAlert, FcrCluster, FcrSignal } from '../services/fcr/types.js';

export async function recordFcrIngest(tenantId: string, signals: FcrSignal[]) {
  const resourceId = `fcr-ingest-${Date.now()}`;
  return provenanceLedger.appendEntry({
    tenantId,
    actionType: 'fcr.ingest',
    resourceType: 'fcr.signal',
    resourceId,
    actorId: 'fcr-service',
    actorType: 'system',
    timestamp: new Date(),
    payload: {
      mutationType: 'CREATE',
      entityId: resourceId,
      entityType: 'fcr.signal',
      count: signals.length,
      sample_ids: signals.slice(0, 5).map((signal) => signal.entity_id),
    },
    metadata: {
      purpose: 'federated-campaign-radar',
      privacy: {
        mechanism: 'dp-budget',
      },
    },
  });
}

export async function recordFcrClusters(tenantId: string, clusters: FcrCluster[]) {
  const resourceId = `fcr-cluster-${Date.now()}`;
  return provenanceLedger.appendEntry({
    tenantId,
    actionType: 'fcr.cluster',
    resourceType: 'fcr.cluster',
    resourceId,
    actorId: 'fcr-service',
    actorType: 'system',
    timestamp: new Date(),
    payload: {
      mutationType: 'CREATE',
      entityId: resourceId,
      entityType: 'fcr.cluster',
      count: clusters.length,
      cluster_ids: clusters.map((cluster) => cluster.cluster_id),
    },
    metadata: {
      purpose: 'federated-campaign-radar',
    },
  });
}

export async function recordFcrAlert(tenantId: string, alerts: FcrAlert[]) {
  const resourceId = `fcr-alert-${Date.now()}`;
  return provenanceLedger.appendEntry({
    tenantId,
    actionType: 'fcr.alert',
    resourceType: 'fcr.alert',
    resourceId,
    actorId: 'fcr-service',
    actorType: 'system',
    timestamp: new Date(),
    payload: {
      mutationType: 'CREATE',
      entityId: resourceId,
      entityType: 'fcr.alert',
      count: alerts.length,
      alert_ids: alerts.map((alert) => alert.alert_id),
    },
    metadata: {
      purpose: 'federated-campaign-radar',
    },
  });
}
