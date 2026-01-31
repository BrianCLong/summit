import { v4 as uuidv4 } from 'uuid';
import { FcrAlert, FcrCluster } from './types.js';

export class FcrEarlyWarningService {
  private history = new Map<string, number>();

  evaluateClusters(clusters: FcrCluster[]) {
    return clusters
      .map((cluster) => this.generateAlert(cluster))
      .filter((alert): alert is FcrAlert => Boolean(alert));
  }

  private generateAlert(cluster: FcrCluster) {
    const previous = this.history.get(cluster.centroid_hash) ?? 0;
    this.history.set(cluster.centroid_hash, cluster.signal_count);
    const growth = cluster.signal_count - previous;

    if (growth <= 0) {
      return null;
    }

    const severity = this.severityFor(cluster, growth);
    return {
      alert_id: uuidv4(),
      cluster_id: cluster.cluster_id,
      severity,
      summary: `Cluster ${cluster.centroid_hash} grew by ${growth} signals`,
      generated_at: new Date().toISOString(),
    } satisfies FcrAlert;
  }

  private severityFor(cluster: FcrCluster, growth: number) {
    if (cluster.confidence > 0.85 && growth >= 10) return 'critical';
    if (cluster.confidence > 0.7 && growth >= 5) return 'high';
    if (cluster.confidence > 0.5 && growth >= 3) return 'medium';
    return 'low';
  }
}
