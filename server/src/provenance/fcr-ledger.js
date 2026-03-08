"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordFcrIngest = recordFcrIngest;
exports.recordFcrClusters = recordFcrClusters;
exports.recordFcrAlert = recordFcrAlert;
const ledger_js_1 = require("./ledger.js");
async function safeAppend(entry) {
    try {
        return await ledger_js_1.provenanceLedger.appendEntry(entry);
    }
    catch {
        // FCR pipeline should continue even if provenance persistence is unavailable.
        return null;
    }
}
async function recordFcrIngest(tenantId, signals) {
    return safeAppend({
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
async function recordFcrClusters(tenantId, clusters) {
    return safeAppend({
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
async function recordFcrAlert(tenantId, alerts) {
    return safeAppend({
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
