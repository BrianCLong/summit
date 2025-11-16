/**
 * Maestro Conductor v24.4.0 - Auto-Partitioning for Heavy Tenants
 * Epic E20: Cost-Aware Scaling & Tenancy Partitioning
 *
 * Dynamic tenant partitioning and isolation based on resource consumption
 * Automatically migrates heavy tenants to dedicated resources to prevent noisy neighbor issues
 */

import { EventEmitter } from 'events';
import { PrometheusMetrics } from '../utils/metrics';
import logger from '../utils/logger';
import { tracer, Span } from '../utils/tracing';
import { DatabaseService } from './DatabaseService';
import { TenantCostService } from './TenantCostService';

// Partitioning configuration
interface PartitioningConfig {
  enabled: boolean;
  evaluationIntervalMinutes: number;
  migrationWindowHours: number;
  partitionTypes: PartitionType[];
  thresholds: PartitioningThresholds;
  autoMigrationEnabled: boolean;
  rollbackEnabled: boolean;
}

// Partition type definitions
interface PartitionType {
  name: string;
  description: string;
  resourceLimits: ResourceLimits;
  isolationLevel:
    | 'shared'
    | 'dedicated_compute'
    | 'dedicated_instance'
    | 'dedicated_cluster';
  costMultiplier: number;
  priority: number;
}

// Resource limits for partitions
interface ResourceLimits {
  maxCpuCores: number;
  maxMemoryGB: number;
  maxStorageGB: number;
  maxNetworkMbps: number;
  maxConcurrentQueries: number;
  maxDailyApiCalls: number;
}

// Thresholds for partitioning decisions
interface PartitioningThresholds {
  // CPU usage thresholds
  heavyCpuThreshold: number; // % CPU usage over evaluation period
  sustainedCpuMinutes: number; // Minutes of sustained high CPU

  // Memory thresholds
  heavyMemoryThreshold: number; // % Memory usage
  memoryGrowthRate: number; // % growth per hour

  // Query load thresholds
  heavyQueryThreshold: number; // Queries per hour
  slowQueryPercentage: number; // % of queries taking >5s

  // Storage thresholds
  heavyStorageThreshold: number; // GB of storage
  storageGrowthRate: number; // GB growth per day

  // Network thresholds
  heavyNetworkThreshold: number; // MB/s sustained network usage

  // Cost-based thresholds
  costPercentileThreshold: number; // Cost percentile (e.g., top 5%)
  costGrowthRate: number; // % cost increase
}

// Tenant partition state
interface TenantPartition {
  tenantId: string;
  currentPartition: string;
  targetPartition: string | null;
  partitionType: PartitionType;

  // Resource usage metrics
  metrics: {
    avgCpuPercent: number;
    avgMemoryPercent: number;
    avgQueriesPerHour: number;
    avgStorageGB: number;
    avgNetworkMbps: number;
    avgDailyCost: number;
  };

  // Migration state
  migration: {
    status:
      | 'none'
      | 'scheduled'
      | 'in_progress'
      | 'completed'
      | 'failed'
      | 'rolled_back';
    scheduledAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    reason: string;
    rollbackReason?: string;
  };

  // History
  history: PartitioningEvent[];
  lastEvaluated: Date;
  lastMigrated?: Date;
}

// Partitioning event for audit trail
interface PartitioningEvent {
  timestamp: Date;
  event:
    | 'evaluation'
    | 'migration_scheduled'
    | 'migration_started'
    | 'migration_completed'
    | 'migration_failed'
    | 'rollback';
  fromPartition?: string;
  toPartition?: string;
  reason: string;
  metrics?: any;
  duration?: number;
}

// Migration plan
interface MigrationPlan {
  tenantId: string;
  fromPartition: string;
  toPartition: string;
  estimatedDuration: number;
  steps: MigrationStep[];
  rollbackSteps: MigrationStep[];
  riskAssessment: RiskAssessment;
}

// Individual migration step
interface MigrationStep {
  name: string;
  description: string;
  estimatedDuration: number;
  rollbackable: boolean;
  dependencies: string[];
  command: string;
  validation: string;
}

// Risk assessment for migration
interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  factors: string[];
  mitigations: string[];
  downtime: number; // Estimated downtime in minutes
  dataLoss: boolean;
  rollbackComplexity: 'simple' | 'complex' | 'irreversible';
}

export class TenantPartitioningService extends EventEmitter {
  private config: PartitioningConfig;
  private metrics: PrometheusMetrics;
  private db: DatabaseService;
  private costService: TenantCostService;
  private partitions: Map<string, TenantPartition> = new Map();
  private migrationQueue: MigrationPlan[] = [];
  private activeMigrations: Map<string, MigrationPlan> = new Map();

  constructor(
    config: Partial<PartitioningConfig> = {},
    db: DatabaseService,
    costService: TenantCostService,
  ) {
    super();

    this.config = {
      enabled: true,
      evaluationIntervalMinutes: 60, // Hourly evaluation
      migrationWindowHours: 4, // 4-hour migration window
      partitionTypes: this.getDefaultPartitionTypes(),
      thresholds: this.getDefaultThresholds(),
      autoMigrationEnabled: false, // Require manual approval by default
      rollbackEnabled: true,
      ...config,
    };

    this.db = db;
    this.costService = costService;
    this.metrics = new PrometheusMetrics('tenant_partitioning');

    this.initializeMetrics();
    this.loadTenantPartitions();
    this.startEvaluationLoop();
  }

  private getDefaultPartitionTypes(): PartitionType[] {
    return [
      {
        name: 'shared_basic',
        description: 'Shared multi-tenant environment for light workloads',
        isolationLevel: 'shared',
        costMultiplier: 1.0,
        priority: 1,
        resourceLimits: {
          maxCpuCores: 2,
          maxMemoryGB: 4,
          maxStorageGB: 100,
          maxNetworkMbps: 100,
          maxConcurrentQueries: 10,
          maxDailyApiCalls: 10000,
        },
      },
      {
        name: 'shared_premium',
        description: 'Shared environment with higher resource allocation',
        isolationLevel: 'shared',
        costMultiplier: 2.0,
        priority: 2,
        resourceLimits: {
          maxCpuCores: 8,
          maxMemoryGB: 16,
          maxStorageGB: 500,
          maxNetworkMbps: 500,
          maxConcurrentQueries: 50,
          maxDailyApiCalls: 100000,
        },
      },
      {
        name: 'dedicated_compute',
        description: 'Dedicated compute resources with shared storage',
        isolationLevel: 'dedicated_compute',
        costMultiplier: 3.0,
        priority: 3,
        resourceLimits: {
          maxCpuCores: 16,
          maxMemoryGB: 64,
          maxStorageGB: 2000,
          maxNetworkMbps: 1000,
          maxConcurrentQueries: 100,
          maxDailyApiCalls: 500000,
        },
      },
      {
        name: 'dedicated_instance',
        description: 'Completely isolated instance for heavy workloads',
        isolationLevel: 'dedicated_instance',
        costMultiplier: 5.0,
        priority: 4,
        resourceLimits: {
          maxCpuCores: 32,
          maxMemoryGB: 128,
          maxStorageGB: 10000,
          maxNetworkMbps: 10000,
          maxConcurrentQueries: 500,
          maxDailyApiCalls: 2000000,
        },
      },
    ];
  }

  private getDefaultThresholds(): PartitioningThresholds {
    return {
      heavyCpuThreshold: 70,
      sustainedCpuMinutes: 30,
      heavyMemoryThreshold: 80,
      memoryGrowthRate: 10,
      heavyQueryThreshold: 1000,
      slowQueryPercentage: 20,
      heavyStorageThreshold: 1000,
      storageGrowthRate: 100,
      heavyNetworkThreshold: 100,
      costPercentileThreshold: 95,
      costGrowthRate: 50,
    };
  }

  private initializeMetrics(): void {
    this.metrics.createGauge(
      'tenant_partitions_total',
      'Total tenant partitions by type',
      ['partition_type'],
    );
    this.metrics.createGauge(
      'active_migrations',
      'Currently active migrations',
    );
    this.metrics.createGauge('migration_queue_size', 'Size of migration queue');

    this.metrics.createCounter(
      'evaluations_total',
      'Total partition evaluations',
      ['tenant_id', 'result'],
    );
    this.metrics.createCounter(
      'migrations_total',
      'Total migrations attempted',
      ['from_partition', 'to_partition', 'status'],
    );
    this.metrics.createCounter('rollbacks_total', 'Total migration rollbacks', [
      'partition_type',
      'reason',
    ]);

    this.metrics.createHistogram(
      'evaluation_duration',
      'Time to evaluate partitioning',
      {
        buckets: [0.1, 0.5, 1, 2, 5, 10],
      },
    );

    this.metrics.createHistogram(
      'migration_duration',
      'Migration completion time',
      {
        buckets: [60, 300, 900, 1800, 3600, 7200], // 1min to 2hrs
      },
    );
  }

  private async loadTenantPartitions(): Promise<void> {
    try {
      const results = await this.db.query(`
        SELECT tenant_id, partition_config 
        FROM tenant_partitions 
        WHERE active = true
      `);

      for (const row of results.rows) {
        const partition: TenantPartition = JSON.parse(row.partition_config);
        this.partitions.set(row.tenant_id, partition);
      }

      logger.info('Loaded tenant partitions', { count: results.rows.length });
    } catch (error) {
      logger.error('Failed to load tenant partitions', {
        error: error.message,
      });
    }
  }

  private startEvaluationLoop(): void {
    if (!this.config.enabled) {
      logger.info('Tenant partitioning disabled');
      return;
    }

    // Run evaluation loop
    setInterval(
      async () => {
        await this.evaluateAllTenants();
      },
      this.config.evaluationIntervalMinutes * 60 * 1000,
    );

    // Process migration queue
    setInterval(async () => {
      await this.processMigrationQueue();
    }, 60 * 1000); // Check every minute

    logger.info('Tenant partitioning evaluation loop started', {
      interval: this.config.evaluationIntervalMinutes,
      autoMigration: this.config.autoMigrationEnabled,
    });
  }

  // Main evaluation method
  public async evaluateAllTenants(): Promise<void> {
    return tracer.startActiveSpan(
      'tenant_partitioning.evaluate_all',
      async (span: Span) => {
        const startTime = Date.now();
        let evaluated = 0;
        let recommended = 0;

        try {
          // Get all active tenants
          const tenants = await this.getActiveTenants();

          for (const tenantId of tenants) {
            try {
              const result = await this.evaluateTenant(tenantId);
              evaluated++;

              if (
                result.recommendedPartition &&
                result.recommendedPartition !== result.currentPartition
              ) {
                recommended++;
              }
            } catch (error) {
              logger.error('Failed to evaluate tenant', {
                tenantId,
                error: error.message,
              });
            }
          }

          const duration = (Date.now() - startTime) / 1000;
          this.metrics.observeHistogram('evaluation_duration', duration);

          logger.info('Completed tenant partition evaluation', {
            tenantsEvaluated: evaluated,
            migrationsRecommended: recommended,
            duration,
          });
        } catch (error) {
          logger.error('Failed to evaluate all tenants', {
            error: error.message,
          });
          span.recordException(error as Error);
        }
      },
    );
  }

  public async evaluateTenant(tenantId: string): Promise<{
    currentPartition: string;
    recommendedPartition: string | null;
    reason: string;
    metrics: any;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    return tracer.startActiveSpan(
      'tenant_partitioning.evaluate_tenant',
      async (span: Span) => {
        span.setAttributes({ 'tenant_partitioning.tenant_id': tenantId });

        try {
          // Get current partition info
          let partition = this.partitions.get(tenantId);
          if (!partition) {
            partition = await this.initializeTenantPartition(tenantId);
          }

          // Collect resource usage metrics
          const metrics = await this.collectTenantMetrics(tenantId);

          // Analyze resource usage against thresholds
          const analysis = this.analyzeResourceUsage(metrics);

          // Determine recommended partition
          const recommendedPartition = this.determineOptimalPartition(
            metrics,
            analysis,
          );

          // Calculate risk level for potential migration
          const riskLevel = this.calculateMigrationRisk(
            partition.currentPartition,
            recommendedPartition,
          );

          // Update partition metrics
          partition.metrics = metrics;
          partition.lastEvaluated = new Date();

          // Add evaluation event to history
          partition.history.push({
            timestamp: new Date(),
            event: 'evaluation',
            reason: analysis.summary,
            metrics: metrics,
          });

          // Save updated partition info
          await this.savePartitionInfo(tenantId, partition);

          const result = {
            currentPartition: partition.currentPartition,
            recommendedPartition:
              recommendedPartition !== partition.currentPartition
                ? recommendedPartition
                : null,
            reason: analysis.summary,
            metrics,
            riskLevel,
          };

          this.metrics.incrementCounter('evaluations_total', {
            tenant_id: tenantId,
            result: result.recommendedPartition
              ? 'migration_recommended'
              : 'no_change',
          });

          // Schedule migration if auto-migration enabled and different partition recommended
          if (this.config.autoMigrationEnabled && result.recommendedPartition) {
            await this.scheduleMigration(
              tenantId,
              result.recommendedPartition,
              analysis.summary,
            );
          }

          return result;
        } catch (error) {
          logger.error('Failed to evaluate tenant partition', {
            tenantId,
            error: error.message,
          });
          span.recordException(error as Error);
          throw error;
        }
      },
    );
  }

  private async getActiveTenants(): Promise<string[]> {
    const result = await this.db.query(`
      SELECT DISTINCT tenant_id 
      FROM tenant_resource_usage 
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
    `);

    return result.rows.map((row) => row.tenant_id);
  }

  private async initializeTenantPartition(
    tenantId: string,
  ): Promise<TenantPartition> {
    const partition: TenantPartition = {
      tenantId,
      currentPartition: 'shared_basic', // Default partition
      targetPartition: null,
      partitionType: this.config.partitionTypes.find(
        (pt) => pt.name === 'shared_basic',
      )!,
      metrics: {
        avgCpuPercent: 0,
        avgMemoryPercent: 0,
        avgQueriesPerHour: 0,
        avgStorageGB: 0,
        avgNetworkMbps: 0,
        avgDailyCost: 0,
      },
      migration: {
        status: 'none',
        reason: 'Initial partition assignment',
      },
      history: [
        {
          timestamp: new Date(),
          event: 'evaluation',
          reason: 'Initialized with default partition',
          toPartition: 'shared_basic',
        },
      ],
      lastEvaluated: new Date(),
    };

    this.partitions.set(tenantId, partition);
    await this.savePartitionInfo(tenantId, partition);

    return partition;
  }

  private async collectTenantMetrics(tenantId: string): Promise<any> {
    // Get resource usage from the past 24 hours
    const usageResult = await this.db.query(
      `
      SELECT 
        AVG(cpu_percent) as avg_cpu_percent,
        AVG(memory_percent) as avg_memory_percent,
        AVG(queries_per_hour) as avg_queries_per_hour,
        AVG(storage_gb) as avg_storage_gb,
        AVG(network_mbps) as avg_network_mbps
      FROM tenant_resource_metrics
      WHERE tenant_id = $1 
      AND timestamp >= NOW() - INTERVAL '24 hours'
    `,
      [tenantId],
    );

    // Get cost information
    const costMetrics = await this.costService.calculateTenantCosts(
      tenantId,
      'day',
    );

    return {
      avgCpuPercent: parseFloat(usageResult.rows[0]?.avg_cpu_percent) || 0,
      avgMemoryPercent:
        parseFloat(usageResult.rows[0]?.avg_memory_percent) || 0,
      avgQueriesPerHour:
        parseFloat(usageResult.rows[0]?.avg_queries_per_hour) || 0,
      avgStorageGB: parseFloat(usageResult.rows[0]?.avg_storage_gb) || 0,
      avgNetworkMbps: parseFloat(usageResult.rows[0]?.avg_network_mbps) || 0,
      avgDailyCost: costMetrics.costs.total,
    };
  }

  private analyzeResourceUsage(metrics: any): {
    heavyCompute: boolean;
    heavyMemory: boolean;
    heavyQuery: boolean;
    heavyStorage: boolean;
    heavyNetwork: boolean;
    highCost: boolean;
    summary: string;
    score: number;
  } {
    const thresholds = this.config.thresholds;

    const analysis = {
      heavyCompute: metrics.avgCpuPercent > thresholds.heavyCpuThreshold,
      heavyMemory: metrics.avgMemoryPercent > thresholds.heavyMemoryThreshold,
      heavyQuery: metrics.avgQueriesPerHour > thresholds.heavyQueryThreshold,
      heavyStorage: metrics.avgStorageGB > thresholds.heavyStorageThreshold,
      heavyNetwork: metrics.avgNetworkMbps > thresholds.heavyNetworkThreshold,
      highCost: metrics.avgDailyCost > 100, // $100/day threshold
      summary: '',
      score: 0,
    };

    // Calculate composite score
    let score = 0;
    const factors: string[] = [];

    if (analysis.heavyCompute) {
      score += 20;
      factors.push('high CPU usage');
    }
    if (analysis.heavyMemory) {
      score += 20;
      factors.push('high memory usage');
    }
    if (analysis.heavyQuery) {
      score += 15;
      factors.push('high query load');
    }
    if (analysis.heavyStorage) {
      score += 10;
      factors.push('large storage footprint');
    }
    if (analysis.heavyNetwork) {
      score += 10;
      factors.push('high network usage');
    }
    if (analysis.highCost) {
      score += 25;
      factors.push('high operational cost');
    }

    analysis.score = score;
    analysis.summary =
      factors.length > 0
        ? `Tenant shows ${factors.join(', ')}`
        : 'Tenant within normal resource usage patterns';

    return analysis;
  }

  private determineOptimalPartition(metrics: any, analysis: any): string {
    // Score-based partition recommendation
    if (analysis.score >= 80) {
      return 'dedicated_instance';
    } else if (analysis.score >= 60) {
      return 'dedicated_compute';
    } else if (analysis.score >= 30) {
      return 'shared_premium';
    } else {
      return 'shared_basic';
    }
  }

  private calculateMigrationRisk(
    fromPartition: string,
    toPartition: string,
  ): 'low' | 'medium' | 'high' {
    if (fromPartition === toPartition) return 'low';

    const fromType = this.config.partitionTypes.find(
      (pt) => pt.name === fromPartition,
    );
    const toType = this.config.partitionTypes.find(
      (pt) => pt.name === toPartition,
    );

    if (!fromType || !toType) return 'high';

    // Risk increases with isolation level changes
    if (fromType.isolationLevel !== toType.isolationLevel) {
      return 'high';
    }

    // Moving to higher resource allocation is generally lower risk
    if (toType.priority > fromType.priority) {
      return 'low';
    }

    // Moving to lower resource allocation has medium risk
    return 'medium';
  }

  private async savePartitionInfo(
    tenantId: string,
    partition: TenantPartition,
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO tenant_partitions (tenant_id, partition_config, active, updated_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (tenant_id) DO UPDATE SET
        partition_config = $2, updated_at = NOW()
      `,
        [tenantId, JSON.stringify(partition)],
      );
    } catch (error) {
      logger.error('Failed to save partition info', {
        tenantId,
        error: error.message,
      });
    }
  }

  // Migration management
  public async scheduleMigration(
    tenantId: string,
    targetPartition: string,
    reason: string,
  ): Promise<void> {
    const partition = this.partitions.get(tenantId);
    if (!partition) {
      throw new Error(`Partition not found for tenant: ${tenantId}`);
    }

    // Check if migration already in progress
    if (
      partition.migration.status === 'in_progress' ||
      partition.migration.status === 'scheduled'
    ) {
      logger.warn('Migration already in progress for tenant', { tenantId });
      return;
    }

    // Create migration plan
    const plan = await this.createMigrationPlan(
      tenantId,
      partition.currentPartition,
      targetPartition,
    );

    // Update partition state
    partition.migration = {
      status: 'scheduled',
      scheduledAt: new Date(),
      reason,
    };
    partition.targetPartition = targetPartition;

    partition.history.push({
      timestamp: new Date(),
      event: 'migration_scheduled',
      fromPartition: partition.currentPartition,
      toPartition: targetPartition,
      reason,
    });

    await this.savePartitionInfo(tenantId, partition);

    // Add to migration queue
    this.migrationQueue.push(plan);
    this.metrics.setGauge('migration_queue_size', this.migrationQueue.length);

    logger.info('Migration scheduled', {
      tenantId,
      fromPartition: partition.currentPartition,
      toPartition: targetPartition,
      reason,
    });

    this.emit('migrationScheduled', { tenantId, plan });
  }

  private async createMigrationPlan(
    tenantId: string,
    fromPartition: string,
    toPartition: string,
  ): Promise<MigrationPlan> {
    const steps: MigrationStep[] = [];
    const rollbackSteps: MigrationStep[] = [];

    // Common migration steps based on partition types
    const fromType = this.config.partitionTypes.find(
      (pt) => pt.name === fromPartition,
    )!;
    const toType = this.config.partitionTypes.find(
      (pt) => pt.name === toPartition,
    )!;

    // Data backup step
    steps.push({
      name: 'backup_data',
      description: 'Create backup of tenant data',
      estimatedDuration: 300, // 5 minutes
      rollbackable: true,
      dependencies: [],
      command: `pg_dump --tenant ${tenantId}`,
      validation: `verify_backup --tenant ${tenantId}`,
    });

    // Resource allocation adjustment
    if (fromType.isolationLevel !== toType.isolationLevel) {
      steps.push({
        name: 'allocate_resources',
        description: `Allocate ${toType.isolationLevel} resources`,
        estimatedDuration: 600, // 10 minutes
        rollbackable: true,
        dependencies: ['backup_data'],
        command: `allocate_partition --tenant ${tenantId} --type ${toPartition}`,
        validation: `verify_resources --tenant ${tenantId} --type ${toPartition}`,
      });

      rollbackSteps.unshift({
        name: 'deallocate_resources',
        description: `Deallocate ${toType.isolationLevel} resources`,
        estimatedDuration: 300,
        rollbackable: false,
        dependencies: [],
        command: `deallocate_partition --tenant ${tenantId} --type ${toPartition}`,
        validation: `verify_deallocation --tenant ${tenantId}`,
      });
    }

    // Data migration
    steps.push({
      name: 'migrate_data',
      description: 'Migrate tenant data to new partition',
      estimatedDuration: 1800, // 30 minutes
      rollbackable: true,
      dependencies: ['backup_data', 'allocate_resources'],
      command: `migrate_tenant_data --tenant ${tenantId} --to ${toPartition}`,
      validation: `verify_migration --tenant ${tenantId} --to ${toPartition}`,
    });

    rollbackSteps.unshift({
      name: 'restore_data',
      description: 'Restore tenant data to original partition',
      estimatedDuration: 900,
      rollbackable: false,
      dependencies: [],
      command: `restore_tenant_data --tenant ${tenantId} --to ${fromPartition}`,
      validation: `verify_restore --tenant ${tenantId} --to ${fromPartition}`,
    });

    // Update routing
    steps.push({
      name: 'update_routing',
      description: 'Update request routing to new partition',
      estimatedDuration: 60, // 1 minute
      rollbackable: true,
      dependencies: ['migrate_data'],
      command: `update_routing --tenant ${tenantId} --partition ${toPartition}`,
      validation: `verify_routing --tenant ${tenantId} --partition ${toPartition}`,
    });

    rollbackSteps.unshift({
      name: 'revert_routing',
      description: 'Revert request routing to original partition',
      estimatedDuration: 60,
      rollbackable: false,
      dependencies: [],
      command: `update_routing --tenant ${tenantId} --partition ${fromPartition}`,
      validation: `verify_routing --tenant ${tenantId} --partition ${fromPartition}`,
    });

    const totalDuration = steps.reduce(
      (sum, step) => sum + step.estimatedDuration,
      0,
    );

    const riskAssessment: RiskAssessment = {
      overallRisk:
        fromType.isolationLevel !== toType.isolationLevel ? 'high' : 'medium',
      factors: [
        fromType.isolationLevel !== toType.isolationLevel
          ? 'Isolation level change'
          : null,
        'Data migration required',
        'Routing updates needed',
      ].filter(Boolean) as string[],
      mitigations: [
        'Full data backup before migration',
        'Gradual traffic switching',
        'Automated rollback on failure',
      ],
      downtime: 120, // 2 minutes estimated downtime
      dataLoss: false,
      rollbackComplexity: 'complex',
    };

    return {
      tenantId,
      fromPartition,
      toPartition,
      estimatedDuration: totalDuration,
      steps,
      rollbackSteps,
      riskAssessment,
    };
  }

  private async processMigrationQueue(): Promise<void> {
    if (this.migrationQueue.length === 0) return;

    // Process migrations during maintenance window
    const now = new Date();
    const hour = now.getUTCHours();

    // Only process migrations during low-traffic hours (2-6 AM UTC)
    if (hour < 2 || hour > 6) return;

    // Limit concurrent migrations
    if (this.activeMigrations.size >= 3) return;

    const plan = this.migrationQueue.shift()!;
    this.metrics.setGauge('migration_queue_size', this.migrationQueue.length);

    try {
      await this.executeMigration(plan);
    } catch (error) {
      logger.error('Failed to execute migration', {
        tenantId: plan.tenantId,
        error: error.message,
      });
    }
  }

  private async executeMigration(plan: MigrationPlan): Promise<void> {
    const { tenantId } = plan;
    const partition = this.partitions.get(tenantId)!;

    logger.info('Starting tenant migration', {
      tenantId,
      from: plan.fromPartition,
      to: plan.toPartition,
    });

    // Update state
    partition.migration.status = 'in_progress';
    partition.migration.startedAt = new Date();
    partition.history.push({
      timestamp: new Date(),
      event: 'migration_started',
      fromPartition: plan.fromPartition,
      toPartition: plan.toPartition,
      reason: partition.migration.reason,
    });

    this.activeMigrations.set(tenantId, plan);
    this.metrics.setGauge('active_migrations', this.activeMigrations.size);

    const startTime = Date.now();

    try {
      // Execute migration steps
      for (const step of plan.steps) {
        logger.debug('Executing migration step', {
          tenantId,
          step: step.name,
          description: step.description,
        });

        // In a real implementation, this would execute the actual migration commands
        await this.executeStep(step);

        // Validate step completion
        await this.validateStep(step);
      }

      // Migration completed successfully
      partition.currentPartition = plan.toPartition;
      partition.targetPartition = null;
      partition.partitionType = this.config.partitionTypes.find(
        (pt) => pt.name === plan.toPartition,
      )!;
      partition.migration.status = 'completed';
      partition.migration.completedAt = new Date();
      partition.lastMigrated = new Date();

      const duration = Date.now() - startTime;
      partition.history.push({
        timestamp: new Date(),
        event: 'migration_completed',
        fromPartition: plan.fromPartition,
        toPartition: plan.toPartition,
        reason: partition.migration.reason,
        duration,
      });

      this.metrics.incrementCounter('migrations_total', {
        from_partition: plan.fromPartition,
        to_partition: plan.toPartition,
        status: 'completed',
      });

      this.metrics.observeHistogram('migration_duration', duration / 1000);

      logger.info('Migration completed successfully', {
        tenantId,
        from: plan.fromPartition,
        to: plan.toPartition,
        duration,
      });

      this.emit('migrationCompleted', { tenantId, plan, duration });
    } catch (error) {
      // Migration failed - attempt rollback
      logger.error('Migration failed, attempting rollback', {
        tenantId,
        error: error.message,
      });

      partition.migration.status = 'failed';

      try {
        await this.rollbackMigration(plan, error.message);
      } catch (rollbackError) {
        logger.error('Rollback failed', {
          tenantId,
          error: rollbackError.message,
        });
      }

      this.metrics.incrementCounter('migrations_total', {
        from_partition: plan.fromPartition,
        to_partition: plan.toPartition,
        status: 'failed',
      });

      this.emit('migrationFailed', { tenantId, plan, error: error.message });
    } finally {
      this.activeMigrations.delete(tenantId);
      this.metrics.setGauge('active_migrations', this.activeMigrations.size);
      await this.savePartitionInfo(tenantId, partition);
    }
  }

  private async executeStep(step: MigrationStep): Promise<void> {
    // In a real implementation, this would execute the actual command
    // For now, simulate execution time
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(step.estimatedDuration * 10, 5000)),
    );
  }

  private async validateStep(step: MigrationStep): Promise<void> {
    // In a real implementation, this would run the validation command
    // For now, simulate validation
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async rollbackMigration(
    plan: MigrationPlan,
    reason: string,
  ): Promise<void> {
    const { tenantId } = plan;
    const partition = this.partitions.get(tenantId)!;

    logger.info('Rolling back migration', { tenantId, reason });

    partition.migration.status = 'rolled_back';
    partition.migration.rollbackReason = reason;

    // Execute rollback steps in reverse order
    for (const step of plan.rollbackSteps) {
      try {
        await this.executeStep(step);
        await this.validateStep(step);
      } catch (error) {
        logger.error('Rollback step failed', {
          tenantId,
          step: step.name,
          error: error.message,
        });
        // Continue with other rollback steps
      }
    }

    partition.history.push({
      timestamp: new Date(),
      event: 'rollback',
      fromPartition: plan.toPartition,
      toPartition: plan.fromPartition,
      reason: `Rollback due to: ${reason}`,
    });

    this.metrics.incrementCounter('rollbacks_total', {
      partition_type: plan.toPartition,
      reason: 'migration_failed',
    });

    logger.info('Migration rollback completed', { tenantId });
  }

  // Public API methods
  public async getTenantPartitionInfo(
    tenantId: string,
  ): Promise<TenantPartition | null> {
    return this.partitions.get(tenantId) || null;
  }

  public async requestMigration(
    tenantId: string,
    targetPartition: string,
    reason: string,
  ): Promise<MigrationPlan> {
    const partition = this.partitions.get(tenantId);
    if (!partition) {
      throw new Error(`Tenant partition not found: ${tenantId}`);
    }

    const plan = await this.createMigrationPlan(
      tenantId,
      partition.currentPartition,
      targetPartition,
    );

    if (this.config.autoMigrationEnabled) {
      await this.scheduleMigration(tenantId, targetPartition, reason);
    }

    return plan;
  }

  public getPartitionTypes(): PartitionType[] {
    return this.config.partitionTypes;
  }

  public getActiveMigrations(): MigrationPlan[] {
    return Array.from(this.activeMigrations.values());
  }

  public getMigrationQueue(): MigrationPlan[] {
    return [...this.migrationQueue];
  }

  // Admin methods
  public async approveMigration(tenantId: string): Promise<void> {
    const partition = this.partitions.get(tenantId);
    if (!partition || partition.migration.status !== 'scheduled') {
      throw new Error(`No scheduled migration found for tenant: ${tenantId}`);
    }

    // Migration will be picked up by processMigrationQueue
    logger.info('Migration approved', { tenantId });
    this.emit('migrationApproved', { tenantId });
  }

  public async cancelMigration(
    tenantId: string,
    reason: string,
  ): Promise<void> {
    const partition = this.partitions.get(tenantId);
    if (!partition) {
      throw new Error(`Tenant partition not found: ${tenantId}`);
    }

    if (partition.migration.status === 'in_progress') {
      throw new Error('Cannot cancel migration in progress');
    }

    // Remove from queue
    this.migrationQueue = this.migrationQueue.filter(
      (plan) => plan.tenantId !== tenantId,
    );
    this.metrics.setGauge('migration_queue_size', this.migrationQueue.length);

    partition.migration.status = 'none';
    partition.targetPartition = null;
    partition.history.push({
      timestamp: new Date(),
      event: 'evaluation',
      reason: `Migration cancelled: ${reason}`,
    });

    await this.savePartitionInfo(tenantId, partition);

    logger.info('Migration cancelled', { tenantId, reason });
    this.emit('migrationCancelled', { tenantId, reason });
  }
}

// Export singleton instance
const dbService = new DatabaseService();
export const tenantPartitioningService = new TenantPartitioningService(
  {
    enabled: process.env.TENANT_PARTITIONING_ENABLED !== 'false',
    evaluationIntervalMinutes: parseInt(
      process.env.PARTITIONING_EVALUATION_INTERVAL || '60',
    ),
    migrationWindowHours: parseInt(
      process.env.PARTITIONING_MIGRATION_WINDOW || '4',
    ),
    autoMigrationEnabled: process.env.PARTITIONING_AUTO_MIGRATION === 'true',
    rollbackEnabled: process.env.PARTITIONING_ROLLBACK_ENABLED !== 'false',
  },
  dbService,
  new TenantCostService({}, dbService),
);
