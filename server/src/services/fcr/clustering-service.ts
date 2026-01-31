import { v4 as uuidv4 } from 'uuid';
import { FcrCluster, FcrSignal } from './types.js';

function deriveCentroid(signal: FcrSignal) {
  if (signal.narrative_claim_hash) return signal.narrative_claim_hash;
  if (signal.media_hashes?.sha256) return signal.media_hashes.sha256;
  if (signal.url?.normalized) return signal.url.normalized;
  if (signal.account_handle_hash) return signal.account_handle_hash;
  return signal.entity_id;
}

function bucketTenantCount(count: number): FcrCluster['tenant_count_bucket'] {
  if (count <= 2) return '1-2';
  if (count <= 5) return '3-5';
  if (count <= 10) return '6-10';
  return '11+';
}

export class FcrClusteringService {
  clusterSignals(signals: FcrSignal[]) {
    const clusters = new Map<string, FcrSignal[]>();

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
        const artifacts: { type: 'url' | 'media_hash'; value: string }[] = [];
        if (item.url?.normalized) {
          artifacts.push({ type: 'url', value: item.url.normalized });
        }
        if (item.media_hashes?.sha256) {
          artifacts.push({ type: 'media_hash', value: item.media_hashes.sha256 });
        }
        return artifacts;
      });
      const c2paSignals = items.filter(
        (item) => item.provenance_assertions?.c2pa_status === 'pass',
      );
      const signerSet = new Set(
        items
          .map((item) => item.provenance_assertions?.signer)
          .filter((value): value is string => Boolean(value)),
      );

      const confidence =
        items.reduce((sum, item) => sum + item.confidence_local, 0) /
        items.length;

      const cluster: FcrCluster = {
        cluster_id: uuidv4(),
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
