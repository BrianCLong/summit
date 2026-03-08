"use strict";
/**
 * Elastic Compute Scaler
 *
 * Auto-scales compute resources based on workload
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComputeScaler = void 0;
class ComputeScaler {
    currentNodes = 1;
    minNodes = 1;
    maxNodes = 100;
    async scale(metrics) {
        const targetNodes = this.calculateTargetNodes(metrics);
        if (targetNodes > this.currentNodes) {
            await this.scaleUp(targetNodes - this.currentNodes);
        }
        else if (targetNodes < this.currentNodes) {
            await this.scaleDown(this.currentNodes - targetNodes);
        }
        return this.currentNodes;
    }
    calculateTargetNodes(metrics) {
        let target = this.currentNodes;
        if (metrics.currentLoad > 0.8) {
            target = Math.ceil(this.currentNodes * 1.5);
        }
        else if (metrics.currentLoad < 0.3) {
            target = Math.ceil(this.currentNodes * 0.7);
        }
        return Math.max(this.minNodes, Math.min(this.maxNodes, target));
    }
    async scaleUp(count) {
        this.currentNodes += count;
    }
    async scaleDown(count) {
        this.currentNodes -= count;
    }
}
exports.ComputeScaler = ComputeScaler;
