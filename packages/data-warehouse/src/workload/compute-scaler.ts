/**
 * Elastic Compute Scaler
 *
 * Auto-scales compute resources based on workload
 */

export interface ScalingMetrics {
  currentLoad: number;
  queuedQueries: number;
  avgQueryTime: number;
  cpuUtilization: number;
  memoryUtilization: number;
}

export class ComputeScaler {
  private currentNodes: number = 1;
  private minNodes: number = 1;
  private maxNodes: number = 100;

  async scale(metrics: ScalingMetrics): Promise<number> {
    const targetNodes = this.calculateTargetNodes(metrics);

    if (targetNodes > this.currentNodes) {
      await this.scaleUp(targetNodes - this.currentNodes);
    } else if (targetNodes < this.currentNodes) {
      await this.scaleDown(this.currentNodes - targetNodes);
    }

    return this.currentNodes;
  }

  private calculateTargetNodes(metrics: ScalingMetrics): number {
    let target = this.currentNodes;

    if (metrics.currentLoad > 0.8) {
      target = Math.ceil(this.currentNodes * 1.5);
    } else if (metrics.currentLoad < 0.3) {
      target = Math.ceil(this.currentNodes * 0.7);
    }

    return Math.max(this.minNodes, Math.min(this.maxNodes, target));
  }

  private async scaleUp(count: number): Promise<void> {
    this.currentNodes += count;
  }

  private async scaleDown(count: number): Promise<void> {
    this.currentNodes -= count;
  }
}
