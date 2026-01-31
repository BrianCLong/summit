import { provenanceLedger } from './ledger.js';
import { FcrAlert, FcrCluster, FcrSignal } from '../services/fcr/types.js';

export async function recordFcrIngest(tenantId: string, signals: FcrSignal[]) {
  return provenanceLedger.appendEntry({
    tenantId,
    actionType: 'fcr.ingest',
    resourceType: 'fcr.signal',
    resourceId: `fcr-ingest-${Date.now()}`,
    actorId: 'fcr-service',
    actorType: 'system',
    payload: {
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
  return provenanceLedger.appendEntry({
    tenantId,
    actionType: 'fcr.cluster',
    resourceType: 'fcr.cluster',
    resourceId: `fcr-cluster-${Date.now()}`,
    actorId: 'fcr-service',
    actorType: 'system',
    payload: {
      count: clusters.length,
      cluster_ids: clusters.map((cluster) => cluster.cluster_id),
    },
    metadata: {
      purpose: 'federated-campaign-radar',
    },
  });
}

export async function recordFcrAlert(tenantId: string, alerts: FcrAlert[]) {
  return provenanceLedger.appendEntry({
    tenantId,
    actionType: 'fcr.alert',
    resourceType: 'fcr.alert',
    resourceId: `fcr-alert-${Date.now()}`,
    actorId: 'fcr-service',
    actorType: 'system',
    payload: {
      count: alerts.length,
      alert_ids: alerts.map((alert) => alert.alert_id),
    },
    metadata: {
      purpose: 'federated-campaign-radar',
    },
  });
}
