"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcrClusteringService = void 0;
const uuid_1 = require("uuid");
function deriveCentroid(signal) {
    if (signal.narrative_claim_hash)
        return signal.narrative_claim_hash;
    if (signal.media_hashes?.sha256)
        return signal.media_hashes.sha256;
    if (signal.url?.normalized)
        return signal.url.normalized;
    if (signal.account_handle_hash)
        return signal.account_handle_hash;
    return signal.entity_id;
}
function bucketTenantCount(count) {
    if (count <= 2)
        return '1-2';
    if (count <= 5)
        return '3-5';
    if (count <= 10)
        return '6-10';
    return '11+';
}
class FcrClusteringService {
    clusterSignals(signals) {
        const clusters = new Map();
        for (const signal of signals) {
            const centroid = deriveCentroid(signal);
            const current = clusters.get(centroid) ?? [];
            current.push(signal);
            clusters.set(centroid, current);
        }
        return Array.from(clusters.entries()).map(([centroid, items]) => {
            const tenants = new Set(items.map((item) => item.tenant_id));
            const sorted = items
                .map((item) => new Date(item.observed_at).toISOString())
                .sort();
            const publicArtifacts = items.flatMap((item) => {
                const artifacts = [];
                if (item.url?.normalized) {
                    artifacts.push({ type: 'url', value: item.url.normalized });
                }
                if (item.media_hashes?.sha256) {
                    artifacts.push({ type: 'media_hash', value: item.media_hashes.sha256 });
                }
                return artifacts;
            });
            const c2paSignals = items.filter((item) => item.provenance_assertions?.c2pa_status === 'pass');
            const signerSet = new Set(items
                .map((item) => item.provenance_assertions?.signer)
                .filter((value) => Boolean(value)));
            const confidence = items.reduce((sum, item) => sum + item.confidence_local, 0) /
                items.length;
            const cluster = {
                cluster_id: (0, uuid_1.v4)(),
                centroid_hash: centroid,
                signal_count: items.length,
                tenant_count_bucket: bucketTenantCount(tenants.size),
                confidence: Math.max(0, Math.min(1, confidence)),
                first_observed_at: sorted[0],
                last_observed_at: sorted[sorted.length - 1],
                public_artifacts: publicArtifacts,
                provenance_summary: {
                    c2pa_pass_rate: items.length
                        ? c2paSignals.length / items.length
                        : 0,
                    signer_set: Array.from(signerSet),
                },
            };
            return cluster;
        });
    }
}
exports.FcrClusteringService = FcrClusteringService;
