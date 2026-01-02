
import { tenantTotalCosts, tenantBudgetUtilization } from '../metrics/cost.js';
import { Counter, Gauge } from 'prom-client';

export interface IMetricProvider {
  getTenantCost(tenantId: string): Promise<number>;
  getBudgetUtilization(tenantId: string): Promise<number>;
  getResourceMetrics(tenantId: string): Promise<ResourceMetrics>;
}

export type MetricProvenance = 'real' | 'simulated' | 'forecast';

export interface ResourceMetrics {
  cpu_utilization: number;
  memory_utilization: number;
  storage_usage_gb: number;
  network_io: number;
  isSimulated?: boolean; // Deprecated in favor of provenance
  provenance: MetricProvenance;
}

/**
 * Provides metrics from Prometheus (or simulated fallback).
 *
 * @remarks
 * In a production environment, this class should use the Prometheus HTTP API
 * to fetch cluster-wide metrics. Currently, it falls back to:
 * 1. In-process metrics (for cost/budget)
 * 2. Deterministic simulated data (for resource utilization) to enable UI development without a cluster.
 */
export class PrometheusMetricProvider implements IMetricProvider {

  async getTenantCost(tenantId: string): Promise<number> {
    try {
        const value = await (tenantTotalCosts as any).get();
        const tenantValue = value.values.find((v: any) => v.labels.tenant_id === tenantId);
        return tenantValue ? tenantValue.value : 0;
    } catch (e: any) {
        return 0;
    }
  }

  async getBudgetUtilization(tenantId: string): Promise<number> {
    try {
        const value = await (tenantBudgetUtilization as any).get();
        const tenantValue = value.values.find((v: any) => v.labels.tenant_id === tenantId);
        return tenantValue ? tenantValue.value : 0;
    } catch (e: any) {
        return 0;
    }
  }

  async getResourceMetrics(tenantId: string): Promise<ResourceMetrics> {
    // Deterministic simulation based on time of day (0-24h)
    // No randomness used to ensure test stability and compliance with strict no-randomness policies.
    const hour = new Date().getHours();

    // Deterministic base load using hour
    const baseLoad = 30;
    // Simple sine wave peak at 2 PM (14:00)
    const peakLoad = 40 * Math.sin((hour - 8) * (Math.PI / 12));

    const utilization = Math.max(5, Math.min(95, baseLoad + peakLoad));

    return {
        cpu_utilization: utilization,
        memory_utilization: Math.min(95, utilization * 1.2),
        storage_usage_gb: 1024 + (hour * 0.5), // Slow linear growth simulation
        network_io: utilization * 10,
        isSimulated: true,
        provenance: 'simulated'
    };
  }
}
