import { Counter, Gauge, Histogram } from 'prom-client';
import { trace, Span } from '@opentelemetry/api';

const tracer = trace.getTracer('maestro-cost-metrics', '24.2.0');

// Database operation costs
export const dbOperationCosts = new Counter({
  name: 'db_operation_costs_usd_total',
  help: 'Total database operation costs in USD',
  labelNames: ['db_type', 'operation', 'tenant_id', 'size_tier'],
});

export const dbConnectionCosts = new Gauge({
  name: 'db_connection_costs_usd_per_hour',
  help: 'Database connection costs per hour in USD',
  labelNames: ['db_type', 'pool_size', 'tenant_id'],
});

// Compute costs
export const computeCosts = new Counter({
  name: 'compute_costs_usd_total',
  help: 'Total compute costs in USD',
  labelNames: ['service', 'tenant_id', 'resource_type'],
});

export const memoryUsageCosts = new Gauge({
  name: 'memory_usage_costs_usd_per_hour',
  help: 'Memory usage costs per hour in USD',
  labelNames: ['service', 'tenant_id', 'memory_tier'],
});

export const cpuUsageCosts = new Gauge({
  name: 'cpu_usage_costs_usd_per_hour',
  help: 'CPU usage costs per hour in USD',
  labelNames: ['service', 'tenant_id', 'cpu_tier'],
});

// Storage costs
export const storageCosts = new Counter({
  name: 'storage_costs_usd_total',
  help: 'Total storage costs in USD',
  labelNames: ['storage_type', 'tenant_id', 'size_tier'],
});

export const storageIOCosts = new Counter({
  name: 'storage_io_costs_usd_total',
  help: 'Storage I/O costs in USD',
  labelNames: ['storage_type', 'operation', 'tenant_id'],
});

// Network costs
export const networkCosts = new Counter({
  name: 'network_costs_usd_total',
  help: 'Total network costs in USD',
  labelNames: ['direction', 'tenant_id', 'bandwidth_tier'],
});

export const apiRequestCosts = new Counter({
  name: 'api_request_costs_usd_total',
  help: 'API request costs in USD',
  labelNames: ['endpoint', 'tenant_id', 'request_size_tier'],
});

// AI/ML costs
export const aiProcessingCosts = new Counter({
  name: 'ai_processing_costs_usd_total',
  help: 'AI processing costs in USD',
  labelNames: ['model', 'operation', 'tenant_id'],
});

// Tenant cost tracking
export const tenantTotalCosts = new Gauge({
  name: 'tenant_total_costs_usd',
  help: 'Total costs per tenant in USD',
  labelNames: ['tenant_id', 'billing_period'],
});

export const tenantBudgetUtilization = new Gauge({
  name: 'tenant_budget_utilization_percent',
  help: 'Tenant budget utilization percentage',
  labelNames: ['tenant_id', 'billing_period'],
});

// Alert thresholds
export const costAlerts = new Counter({
  name: 'cost_alerts_total',
  help: 'Total cost alerts triggered',
  labelNames: ['alert_type', 'tenant_id', 'severity'],
});

// Cost optimization metrics
export const costOptimizationSavings = new Counter({
  name: 'cost_optimization_savings_usd_total',
  help: 'Total savings from cost optimization in USD',
  labelNames: ['optimization_type', 'tenant_id'],
});

// Billing period definitions
export enum BillingPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

// Cost tiers for different resource usage levels
export enum CostTier {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge',
}

// Alert severity levels
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

interface CostEvent {
  tenantId: string;
  service: string;
  operation: string;
  costUSD: number;
  resourceType: string;
  metadata?: Record<string, any>;
}

interface BudgetAlert {
  tenantId: string;
  budgetLimit: number;
  currentSpend: number;
  utilizationPercent: number;
  period: BillingPeriod;
  alertType: string;
  severity: AlertSeverity;
}

export class CostTracker {
  private readonly costPerDbOperation = {
    postgresql: {
      read: 0.0001, // $0.0001 per read
      write: 0.0002, // $0.0002 per write
      connection: 0.01, // $0.01 per hour per connection
    },
    neo4j: {
      read: 0.0003,
      write: 0.0005,
      connection: 0.02,
    },
  };

  private readonly costPerComputeUnit = {
    cpu: 0.05, // $0.05 per vCPU hour
    memory: 0.01, // $0.01 per GB hour
    gpu: 2.5, // $2.50 per GPU hour
  };

  private readonly costPerStorageGB = {
    ssd: 0.1, // $0.10 per GB per month
    standard: 0.05, // $0.05 per GB per month
    archive: 0.01, // $0.01 per GB per month
  };

  private readonly costPerNetworkGB = {
    ingress: 0.0, // Free ingress
    egress: 0.09, // $0.09 per GB egress
  };

  async trackDatabaseOperation(
    dbType: 'postgresql' | 'neo4j',
    operation: 'read' | 'write',
    tenantId: string,
    rowsAffected: number = 1,
  ): Promise<void> {
    return tracer.startActiveSpan(
      'cost.track_db_operation',
      async (span: Span) => {
        const baseCost = this.costPerDbOperation[dbType][operation];
        const totalCost = baseCost * rowsAffected;
        const sizeTier = this.determineSizeTier(rowsAffected);

        dbOperationCosts.inc(
          {
            db_type: dbType,
            operation,
            tenant_id: tenantId,
            size_tier: sizeTier,
          },
          totalCost,
        );

        span.setAttributes({
          'cost.db_type': dbType,
          'cost.operation': operation,
          'cost.tenant_id': tenantId,
          'cost.rows_affected': rowsAffected,
          'cost.total_usd': totalCost,
        });

        await this.updateTenantTotalCost(tenantId, totalCost);
        span.end();
      },
    );
  }

  async trackComputeUsage(
    service: string,
    tenantId: string,
    cpuHours: number,
    memoryGBHours: number,
    gpuHours: number = 0,
  ): Promise<void> {
    return tracer.startActiveSpan('cost.track_compute', async (span: Span) => {
      const cpuCost = cpuHours * this.costPerComputeUnit.cpu;
      const memoryCost = memoryGBHours * this.costPerComputeUnit.memory;
      const gpuCost = gpuHours * this.costPerComputeUnit.gpu;
      const totalCost = cpuCost + memoryCost + gpuCost;

      computeCosts.inc(
        {
          service,
          tenant_id: tenantId,
          resource_type: 'cpu',
        },
        cpuCost,
      );

      computeCosts.inc(
        {
          service,
          tenant_id: tenantId,
          resource_type: 'memory',
        },
        memoryCost,
      );

      if (gpuCost > 0) {
        computeCosts.inc(
          {
            service,
            tenant_id: tenantId,
            resource_type: 'gpu',
          },
          gpuCost,
        );
      }

      // Set current hourly costs
      cpuUsageCosts.set(
        {
          service,
          tenant_id: tenantId,
          cpu_tier: this.determineCpuTier(cpuHours),
        },
        cpuCost,
      );

      memoryUsageCosts.set(
        {
          service,
          tenant_id: tenantId,
          memory_tier: this.determineMemoryTier(memoryGBHours),
        },
        memoryCost,
      );

      span.setAttributes({
        'cost.service': service,
        'cost.tenant_id': tenantId,
        'cost.cpu_hours': cpuHours,
        'cost.memory_gb_hours': memoryGBHours,
        'cost.gpu_hours': gpuHours,
        'cost.total_usd': totalCost,
      });

      await this.updateTenantTotalCost(tenantId, totalCost);
      span.end();
    });
  }

  async trackStorageUsage(
    storageType: 'ssd' | 'standard' | 'archive',
    tenantId: string,
    gbStored: number,
    ioOperations: number = 0,
  ): Promise<void> {
    return tracer.startActiveSpan('cost.track_storage', async (span: Span) => {
      const storageCost =
        (gbStored * this.costPerStorageGB[storageType]) / 30 / 24; // Per hour
      const ioCost = ioOperations * 0.0001; // $0.0001 per IO operation

      storageCosts.inc(
        {
          storage_type: storageType,
          tenant_id: tenantId,
          size_tier: this.determineStorageTier(gbStored),
        },
        storageCost,
      );

      if (ioCost > 0) {
        storageIOCosts.inc(
          {
            storage_type: storageType,
            operation: 'io',
            tenant_id: tenantId,
          },
          ioCost,
        );
      }

      span.setAttributes({
        'cost.storage_type': storageType,
        'cost.tenant_id': tenantId,
        'cost.gb_stored': gbStored,
        'cost.io_operations': ioOperations,
        'cost.total_usd': storageCost + ioCost,
      });

      await this.updateTenantTotalCost(tenantId, storageCost + ioCost);
      span.end();
    });
  }

  async trackNetworkUsage(
    direction: 'ingress' | 'egress',
    tenantId: string,
    gbTransferred: number,
  ): Promise<void> {
    return tracer.startActiveSpan('cost.track_network', async (span: Span) => {
      const cost = gbTransferred * this.costPerNetworkGB[direction];
      const tier = this.determineBandwidthTier(gbTransferred);

      networkCosts.inc(
        {
          direction,
          tenant_id: tenantId,
          bandwidth_tier: tier,
        },
        cost,
      );

      span.setAttributes({
        'cost.direction': direction,
        'cost.tenant_id': tenantId,
        'cost.gb_transferred': gbTransferred,
        'cost.total_usd': cost,
      });

      await this.updateTenantTotalCost(tenantId, cost);
      span.end();
    });
  }

  async trackAPIRequest(
    endpoint: string,
    tenantId: string,
    requestSizeKB: number = 1,
  ): Promise<void> {
    return tracer.startActiveSpan(
      'cost.track_api_request',
      async (span: Span) => {
        const baseCost = 0.001; // $0.001 per API request
        const sizeCost = requestSizeKB * 0.0001; // Additional cost for large requests
        const totalCost = baseCost + sizeCost;
        const tier = this.determineRequestSizeTier(requestSizeKB);

        apiRequestCosts.inc(
          {
            endpoint,
            tenant_id: tenantId,
            request_size_tier: tier,
          },
          totalCost,
        );

        span.setAttributes({
          'cost.endpoint': endpoint,
          'cost.tenant_id': tenantId,
          'cost.request_size_kb': requestSizeKB,
          'cost.total_usd': totalCost,
        });

        await this.updateTenantTotalCost(tenantId, totalCost);
        span.end();
      },
    );
  }

  async trackAIProcessing(
    model: string,
    operation: string,
    tenantId: string,
    tokensProcessed: number,
  ): Promise<void> {
    return tracer.startActiveSpan(
      'cost.track_ai_processing',
      async (span: Span) => {
        const costPerToken = 0.00001; // $0.00001 per token
        const totalCost = tokensProcessed * costPerToken;

        aiProcessingCosts.inc(
          {
            model,
            operation,
            tenant_id: tenantId,
          },
          totalCost,
        );

        span.setAttributes({
          'cost.model': model,
          'cost.operation': operation,
          'cost.tenant_id': tenantId,
          'cost.tokens_processed': tokensProcessed,
          'cost.total_usd': totalCost,
        });

        await this.updateTenantTotalCost(tenantId, totalCost);
        span.end();
      },
    );
  }

  private async updateTenantTotalCost(
    tenantId: string,
    additionalCost: number,
  ): Promise<void> {
    // Update hourly total
    tenantTotalCosts.inc(
      {
        tenant_id: tenantId,
        billing_period: BillingPeriod.HOURLY,
      },
      additionalCost,
    );

    // Check budget utilization and trigger alerts if needed
    await this.checkBudgetAlerts(tenantId);
  }

  private async checkBudgetAlerts(tenantId: string): Promise<void> {
    // Get current spend for tenant (this would typically come from a database)
    const currentHourlySpend = 10.5; // Placeholder - would be actual spend
    const hourlyBudget = 15.0; // Placeholder - would be from tenant config

    const utilizationPercent = (currentHourlySpend / hourlyBudget) * 100;

    tenantBudgetUtilization.set(
      {
        tenant_id: tenantId,
        billing_period: BillingPeriod.HOURLY,
      },
      utilizationPercent,
    );

    // Trigger alerts at different thresholds
    if (utilizationPercent >= 90) {
      await this.triggerBudgetAlert(tenantId, {
        tenantId,
        budgetLimit: hourlyBudget,
        currentSpend: currentHourlySpend,
        utilizationPercent,
        period: BillingPeriod.HOURLY,
        alertType: 'budget_exceeded',
        severity: AlertSeverity.CRITICAL,
      });
    } else if (utilizationPercent >= 75) {
      await this.triggerBudgetAlert(tenantId, {
        tenantId,
        budgetLimit: hourlyBudget,
        currentSpend: currentHourlySpend,
        utilizationPercent,
        period: BillingPeriod.HOURLY,
        alertType: 'budget_warning',
        severity: AlertSeverity.WARNING,
      });
    }
  }

  private async triggerBudgetAlert(
    tenantId: string,
    alert: BudgetAlert,
  ): Promise<void> {
    costAlerts.inc({
      alert_type: alert.alertType,
      tenant_id: tenantId,
      severity: alert.severity,
    });

    console.warn(
      `💰 BUDGET ALERT [${alert.severity.toUpperCase()}]: Tenant ${tenantId} at ${alert.utilizationPercent.toFixed(1)}% of budget`,
    );

    // In production, this would send notifications via email, Slack, etc.
  }

  private determineSizeTier(value: number): string {
    if (value < 100) return CostTier.SMALL;
    if (value < 1000) return CostTier.MEDIUM;
    if (value < 10000) return CostTier.LARGE;
    return CostTier.XLARGE;
  }

  private determineCpuTier(cpuHours: number): string {
    if (cpuHours < 1) return CostTier.SMALL;
    if (cpuHours < 4) return CostTier.MEDIUM;
    if (cpuHours < 16) return CostTier.LARGE;
    return CostTier.XLARGE;
  }

  private determineMemoryTier(memoryGBHours: number): string {
    if (memoryGBHours < 2) return CostTier.SMALL;
    if (memoryGBHours < 8) return CostTier.MEDIUM;
    if (memoryGBHours < 32) return CostTier.LARGE;
    return CostTier.XLARGE;
  }

  private determineStorageTier(gbStored: number): string {
    if (gbStored < 10) return CostTier.SMALL;
    if (gbStored < 100) return CostTier.MEDIUM;
    if (gbStored < 1000) return CostTier.LARGE;
    return CostTier.XLARGE;
  }

  private determineBandwidthTier(gbTransferred: number): string {
    if (gbTransferred < 1) return CostTier.SMALL;
    if (gbTransferred < 10) return CostTier.MEDIUM;
    if (gbTransferred < 100) return CostTier.LARGE;
    return CostTier.XLARGE;
  }

  private determineRequestSizeTier(requestSizeKB: number): string {
    if (requestSizeKB < 10) return CostTier.SMALL;
    if (requestSizeKB < 100) return CostTier.MEDIUM;
    if (requestSizeKB < 1000) return CostTier.LARGE;
    return CostTier.XLARGE;
  }
}

// Global cost tracker instance
export const costTracker = new CostTracker();
