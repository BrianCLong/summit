import { EventEmitter } from 'events';
import { logger } from '../config/logger';

export interface TenantAppOpsConfig {
  tenantId: string;
  appOpsConsoleUrl: string;
  dashboardRefreshInterval: number;
  enableRealTimeMetrics: boolean;
  enableQuantumWorkloadAnalytics: boolean;
  budgetAlertThresholds: {
    warning: number;
    critical: number;
  };
  performanceThresholds: {
    maxExecutionTime: number;
    minFidelity: number;
    maxErrorRate: number;
  };
}

export interface QuantumWorkload {
  id: string;
  tenantId: string;
  templateId: string;
  status: WorkloadStatus;
  createdAt: Date;
  updatedAt: Date;
  deploymentId: string;
  executionStats: WorkloadExecutionStats;
  resourceUsage: ResourceUsage;
  performance: WorkloadPerformance;
  budgetConsumption: BudgetConsumption;
  alerts: WorkloadAlert[];
}

export enum WorkloadStatus {
  PENDING = 'PENDING',
  INITIALIZING = 'INITIALIZING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED'
}

export interface WorkloadExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  totalQuantumTime: number;
  circuitDepth: number;
  gateCount: number;
  qubitCount: number;
}

export interface ResourceUsage {
  cpuUtilization: number;
  memoryUtilization: number;
  quantumBackendTime: number;
  networkBandwidth: number;
  storageUsage: number;
  estimatedCost: number;
}

export interface WorkloadPerformance {
  fidelity: number;
  errorRate: number;
  throughput: number;
  latency: number;
  quantumVolume: number;
  classicalOverhead: number;
  optimizationLevel: number;
}

export interface BudgetConsumption {
  totalBudget: number;
  consumedBudget: number;
  remainingBudget: number;
  burnRate: number;
  projectedExhaustion: Date | null;
  costPerExecution: number;
  budgetUtilization: number;
}

export interface WorkloadAlert {
  id: string;
  workloadId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export enum AlertType {
  BUDGET_WARNING = 'BUDGET_WARNING',
  BUDGET_CRITICAL = 'BUDGET_CRITICAL',
  PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',
  ERROR_RATE_HIGH = 'ERROR_RATE_HIGH',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  COMPLIANCE_ISSUE = 'COMPLIANCE_ISSUE'
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY'
}

export interface WorkloadDashboard {
  tenantId: string;
  overview: DashboardOverview;
  activeWorkloads: QuantumWorkload[];
  recentExecutions: ExecutionSummary[];
  performanceMetrics: PerformanceMetrics;
  budgetStatus: BudgetStatus;
  alerts: WorkloadAlert[];
  recommendations: Recommendation[];
}

export interface DashboardOverview {
  totalWorkloads: number;
  activeWorkloads: number;
  totalExecutions: number;
  successRate: number;
  averageFidelity: number;
  totalQuantumTime: number;
  budgetUtilization: number;
}

export interface ExecutionSummary {
  executionId: string;
  workloadId: string;
  templateId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  fidelity?: number;
  cost: number;
}

export enum ExecutionStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface PerformanceMetrics {
  averageExecutionTime: number;
  averageFidelity: number;
  averageErrorRate: number;
  throughputTrend: TrendData[];
  fidelityTrend: TrendData[];
  costTrend: TrendData[];
}

export interface TrendData {
  timestamp: Date;
  value: number;
}

export interface BudgetStatus {
  totalBudget: number;
  consumedBudget: number;
  remainingBudget: number;
  burnRate: number;
  projectedExhaustion: Date | null;
  budgetAlerts: BudgetAlert[];
}

export interface BudgetAlert {
  type: 'WARNING' | 'CRITICAL';
  threshold: number;
  currentUtilization: number;
  message: string;
  timestamp: Date;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  impact: string;
  action: string;
  metadata: Record<string, any>;
}

export enum RecommendationType {
  PERFORMANCE_OPTIMIZATION = 'PERFORMANCE_OPTIMIZATION',
  COST_OPTIMIZATION = 'COST_OPTIMIZATION',
  RESOURCE_OPTIMIZATION = 'RESOURCE_OPTIMIZATION',
  SECURITY_ENHANCEMENT = 'SECURITY_ENHANCEMENT',
  TEMPLATE_UPGRADE = 'TEMPLATE_UPGRADE'
}

export enum RecommendationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface WorkloadDeploymentRequest {
  tenantId: string;
  templateId: string;
  name: string;
  description?: string;
  configuration: Record<string, any>;
  budgetLimit: number;
  priority: WorkloadPriority;
  scheduledStart?: Date;
  autoScale: boolean;
  notifications: NotificationConfig;
}

export enum WorkloadPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface NotificationConfig {
  email: boolean;
  slack: boolean;
  webhook?: string;
  alertThresholds: {
    budgetWarning: number;
    budgetCritical: number;
    performanceDegradation: number;
    errorRateHigh: number;
  };
}

export interface WorkloadScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
}

export interface QuantumResourceAllocation {
  workloadId: string;
  quantumBackend: string;
  qubits: number;
  circuitDepth: number;
  shots: number;
  priority: number;
  estimatedDuration: number;
  cost: number;
}

export class TenantAppOpsService extends EventEmitter {
  private config: TenantAppOpsConfig;
  private workloads: Map<string, QuantumWorkload> = new Map();
  private dashboardCache: Map<string, WorkloadDashboard> = new Map();
  private metricsCollectionInterval?: NodeJS.Timeout;

  constructor(config: TenantAppOpsConfig) {
    super();
    this.config = config;
    this.initializeMetricsCollection();
    logger.info('TenantAppOpsService initialized', { tenantId: config.tenantId });
  }

  private initializeMetricsCollection(): void {
    if (this.config.enableRealTimeMetrics) {
      this.metricsCollectionInterval = setInterval(
        () => this.collectMetrics(),
        this.config.dashboardRefreshInterval
      );
    }
  }

  public async getDashboard(tenantId: string): Promise<WorkloadDashboard> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = this.dashboardCache.get(tenantId);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      const dashboard = await this.buildDashboard(tenantId);
      this.dashboardCache.set(tenantId, dashboard);

      this.emit('dashboardGenerated', { tenantId, duration: Date.now() - startTime });
      return dashboard;
    } catch (error) {
      logger.error('Failed to get dashboard', { tenantId, error: error.message });
      throw error;
    }
  }

  private async buildDashboard(tenantId: string): Promise<WorkloadDashboard> {
    const tenantWorkloads = Array.from(this.workloads.values())
      .filter(w => w.tenantId === tenantId);

    const overview = this.calculateOverview(tenantWorkloads);
    const activeWorkloads = tenantWorkloads.filter(w =>
      [WorkloadStatus.RUNNING, WorkloadStatus.INITIALIZING].includes(w.status)
    );

    const recentExecutions = await this.getRecentExecutions(tenantId);
    const performanceMetrics = this.calculatePerformanceMetrics(tenantWorkloads);
    const budgetStatus = this.calculateBudgetStatus(tenantWorkloads);
    const alerts = this.getActiveAlerts(tenantWorkloads);
    const recommendations = await this.generateRecommendations(tenantId, tenantWorkloads);

    return {
      tenantId,
      overview,
      activeWorkloads,
      recentExecutions,
      performanceMetrics,
      budgetStatus,
      alerts,
      recommendations
    };
  }

  private calculateOverview(workloads: QuantumWorkload[]): DashboardOverview {
    const totalExecutions = workloads.reduce((sum, w) => sum + w.executionStats.totalExecutions, 0);
    const successfulExecutions = workloads.reduce((sum, w) => sum + w.executionStats.successfulExecutions, 0);
    const totalQuantumTime = workloads.reduce((sum, w) => sum + w.executionStats.totalQuantumTime, 0);
    const totalBudget = workloads.reduce((sum, w) => sum + w.budgetConsumption.totalBudget, 0);
    const consumedBudget = workloads.reduce((sum, w) => sum + w.budgetConsumption.consumedBudget, 0);

    return {
      totalWorkloads: workloads.length,
      activeWorkloads: workloads.filter(w =>
        [WorkloadStatus.RUNNING, WorkloadStatus.INITIALIZING].includes(w.status)
      ).length,
      totalExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      averageFidelity: workloads.length > 0 ?
        workloads.reduce((sum, w) => sum + w.performance.fidelity, 0) / workloads.length : 0,
      totalQuantumTime,
      budgetUtilization: totalBudget > 0 ? (consumedBudget / totalBudget) * 100 : 0
    };
  }

  private async getRecentExecutions(tenantId: string, limit = 10): Promise<ExecutionSummary[]> {
    // This would typically query a database or execution service
    // For now, return mock data based on workloads
    const executions: ExecutionSummary[] = [];

    const tenantWorkloads = Array.from(this.workloads.values())
      .filter(w => w.tenantId === tenantId)
      .slice(0, limit);

    for (const workload of tenantWorkloads) {
      executions.push({
        executionId: `exec_${workload.id}_${Date.now()}`,
        workloadId: workload.id,
        templateId: workload.templateId,
        status: this.mapWorkloadStatusToExecutionStatus(workload.status),
        startTime: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
        endTime: workload.status === WorkloadStatus.COMPLETED ? new Date() : undefined,
        duration: workload.executionStats.averageExecutionTime,
        fidelity: workload.performance.fidelity,
        cost: workload.budgetConsumption.costPerExecution
      });
    }

    return executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  private mapWorkloadStatusToExecutionStatus(status: WorkloadStatus): ExecutionStatus {
    switch (status) {
      case WorkloadStatus.PENDING:
      case WorkloadStatus.INITIALIZING:
        return ExecutionStatus.QUEUED;
      case WorkloadStatus.RUNNING:
        return ExecutionStatus.RUNNING;
      case WorkloadStatus.COMPLETED:
        return ExecutionStatus.COMPLETED;
      case WorkloadStatus.FAILED:
        return ExecutionStatus.FAILED;
      case WorkloadStatus.CANCELLED:
        return ExecutionStatus.CANCELLED;
      default:
        return ExecutionStatus.QUEUED;
    }
  }

  private calculatePerformanceMetrics(workloads: QuantumWorkload[]): PerformanceMetrics {
    if (workloads.length === 0) {
      return {
        averageExecutionTime: 0,
        averageFidelity: 0,
        averageErrorRate: 0,
        throughputTrend: [],
        fidelityTrend: [],
        costTrend: []
      };
    }

    const averageExecutionTime = workloads.reduce((sum, w) =>
      sum + w.executionStats.averageExecutionTime, 0) / workloads.length;

    const averageFidelity = workloads.reduce((sum, w) =>
      sum + w.performance.fidelity, 0) / workloads.length;

    const averageErrorRate = workloads.reduce((sum, w) =>
      sum + w.performance.errorRate, 0) / workloads.length;

    // Generate mock trend data for the last 24 hours
    const now = new Date();
    const trendData = [];
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 3600000);
      trendData.push(timestamp);
    }

    return {
      averageExecutionTime,
      averageFidelity,
      averageErrorRate,
      throughputTrend: trendData.map(timestamp => ({
        timestamp,
        value: Math.random() * 100 + 50 // Mock throughput data
      })),
      fidelityTrend: trendData.map(timestamp => ({
        timestamp,
        value: Math.random() * 0.2 + 0.8 // Mock fidelity data (0.8-1.0)
      })),
      costTrend: trendData.map(timestamp => ({
        timestamp,
        value: Math.random() * 50 + 25 // Mock cost data
      }))
    };
  }

  private calculateBudgetStatus(workloads: QuantumWorkload[]): BudgetStatus {
    const totalBudget = workloads.reduce((sum, w) => sum + w.budgetConsumption.totalBudget, 0);
    const consumedBudget = workloads.reduce((sum, w) => sum + w.budgetConsumption.consumedBudget, 0);
    const remainingBudget = totalBudget - consumedBudget;

    // Calculate average burn rate
    const totalBurnRate = workloads.reduce((sum, w) => sum + w.budgetConsumption.burnRate, 0);
    const averageBurnRate = workloads.length > 0 ? totalBurnRate / workloads.length : 0;

    // Project budget exhaustion
    let projectedExhaustion: Date | null = null;
    if (averageBurnRate > 0 && remainingBudget > 0) {
      const daysRemaining = remainingBudget / averageBurnRate;
      projectedExhaustion = new Date(Date.now() + daysRemaining * 24 * 3600 * 1000);
    }

    // Generate budget alerts
    const budgetAlerts: BudgetAlert[] = [];
    const utilizationPercent = totalBudget > 0 ? (consumedBudget / totalBudget) * 100 : 0;

    if (utilizationPercent >= this.config.budgetAlertThresholds.critical) {
      budgetAlerts.push({
        type: 'CRITICAL',
        threshold: this.config.budgetAlertThresholds.critical,
        currentUtilization: utilizationPercent,
        message: `Budget utilization is at ${utilizationPercent.toFixed(1)}%, exceeding critical threshold`,
        timestamp: new Date()
      });
    } else if (utilizationPercent >= this.config.budgetAlertThresholds.warning) {
      budgetAlerts.push({
        type: 'WARNING',
        threshold: this.config.budgetAlertThresholds.warning,
        currentUtilization: utilizationPercent,
        message: `Budget utilization is at ${utilizationPercent.toFixed(1)}%, exceeding warning threshold`,
        timestamp: new Date()
      });
    }

    return {
      totalBudget,
      consumedBudget,
      remainingBudget,
      burnRate: averageBurnRate,
      projectedExhaustion,
      budgetAlerts
    };
  }

  private getActiveAlerts(workloads: QuantumWorkload[]): WorkloadAlert[] {
    const alerts: WorkloadAlert[] = [];

    for (const workload of workloads) {
      alerts.push(...workload.alerts.filter(alert => !alert.resolved));
    }

    return alerts.sort((a, b) => {
      const severityOrder = { EMERGENCY: 4, CRITICAL: 3, WARNING: 2, INFO: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private async generateRecommendations(tenantId: string, workloads: QuantumWorkload[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Performance optimization recommendations
    const lowFidelityWorkloads = workloads.filter(w => w.performance.fidelity < 0.9);
    if (lowFidelityWorkloads.length > 0) {
      recommendations.push({
        id: `perf_opt_${Date.now()}`,
        type: RecommendationType.PERFORMANCE_OPTIMIZATION,
        priority: RecommendationPriority.HIGH,
        title: 'Improve Quantum Fidelity',
        description: `${lowFidelityWorkloads.length} workloads have fidelity below 90%`,
        impact: 'Improving fidelity will increase result accuracy and reduce error rates',
        action: 'Consider upgrading to higher-quality quantum backends or optimizing circuit designs',
        metadata: { workloadIds: lowFidelityWorkloads.map(w => w.id) }
      });
    }

    // Cost optimization recommendations
    const highCostWorkloads = workloads.filter(w => w.budgetConsumption.budgetUtilization > 80);
    if (highCostWorkloads.length > 0) {
      recommendations.push({
        id: `cost_opt_${Date.now()}`,
        type: RecommendationType.COST_OPTIMIZATION,
        priority: RecommendationPriority.MEDIUM,
        title: 'Optimize Cost Efficiency',
        description: `${highCostWorkloads.length} workloads are consuming budget rapidly`,
        impact: 'Cost optimization can extend operational runway and improve ROI',
        action: 'Review circuit optimization strategies and consider batch execution',
        metadata: { workloadIds: highCostWorkloads.map(w => w.id) }
      });
    }

    // Resource optimization recommendations
    const highUtilizationWorkloads = workloads.filter(w =>
      w.resourceUsage.cpuUtilization > 90 || w.resourceUsage.memoryUtilization > 90
    );
    if (highUtilizationWorkloads.length > 0) {
      recommendations.push({
        id: `resource_opt_${Date.now()}`,
        type: RecommendationType.RESOURCE_OPTIMIZATION,
        priority: RecommendationPriority.HIGH,
        title: 'Scale Resources',
        description: `${highUtilizationWorkloads.length} workloads are resource-constrained`,
        impact: 'Resource scaling will improve performance and reduce execution delays',
        action: 'Consider increasing resource allocation or enabling auto-scaling',
        metadata: { workloadIds: highUtilizationWorkloads.map(w => w.id) }
      });
    }

    return recommendations;
  }

  public async deployWorkload(request: WorkloadDeploymentRequest): Promise<QuantumWorkload> {
    const startTime = Date.now();

    try {
      // Validate deployment request
      await this.validateDeploymentRequest(request);

      // Create workload
      const workload: QuantumWorkload = {
        id: `workload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId: request.tenantId,
        templateId: request.templateId,
        status: WorkloadStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        deploymentId: `deploy_${Date.now()}`,
        executionStats: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
          totalQuantumTime: 0,
          circuitDepth: 0,
          gateCount: 0,
          qubitCount: 0
        },
        resourceUsage: {
          cpuUtilization: 0,
          memoryUtilization: 0,
          quantumBackendTime: 0,
          networkBandwidth: 0,
          storageUsage: 0,
          estimatedCost: 0
        },
        performance: {
          fidelity: 0,
          errorRate: 0,
          throughput: 0,
          latency: 0,
          quantumVolume: 0,
          classicalOverhead: 0,
          optimizationLevel: 0
        },
        budgetConsumption: {
          totalBudget: request.budgetLimit,
          consumedBudget: 0,
          remainingBudget: request.budgetLimit,
          burnRate: 0,
          projectedExhaustion: null,
          costPerExecution: 0,
          budgetUtilization: 0
        },
        alerts: []
      };

      // Store workload
      this.workloads.set(workload.id, workload);

      // Initialize workload
      await this.initializeWorkload(workload);

      this.emit('workloadDeployed', {
        workloadId: workload.id,
        tenantId: request.tenantId,
        duration: Date.now() - startTime
      });

      logger.info('Workload deployed successfully', {
        workloadId: workload.id,
        tenantId: request.tenantId
      });

      return workload;
    } catch (error) {
      logger.error('Failed to deploy workload', {
        tenantId: request.tenantId,
        error: error.message
      });
      throw error;
    }
  }

  private async validateDeploymentRequest(request: WorkloadDeploymentRequest): Promise<void> {
    if (!request.tenantId) {
      throw new Error('Tenant ID is required');
    }

    if (!request.templateId) {
      throw new Error('Template ID is required');
    }

    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Workload name is required');
    }

    if (request.budgetLimit <= 0) {
      throw new Error('Budget limit must be positive');
    }

    // Validate configuration
    if (!request.configuration || typeof request.configuration !== 'object') {
      throw new Error('Valid configuration is required');
    }

    // Validate notification config
    if (!request.notifications) {
      throw new Error('Notification configuration is required');
    }
  }

  private async initializeWorkload(workload: QuantumWorkload): Promise<void> {
    try {
      workload.status = WorkloadStatus.INITIALIZING;
      workload.updatedAt = new Date();

      // Simulate initialization process
      await new Promise(resolve => setTimeout(resolve, 1000));

      workload.status = WorkloadStatus.RUNNING;
      workload.updatedAt = new Date();

      this.emit('workloadInitialized', { workloadId: workload.id });
    } catch (error) {
      workload.status = WorkloadStatus.FAILED;
      workload.updatedAt = new Date();

      const alert: WorkloadAlert = {
        id: `alert_${Date.now()}`,
        workloadId: workload.id,
        type: AlertType.EXECUTION_TIMEOUT,
        severity: AlertSeverity.CRITICAL,
        message: `Workload initialization failed: ${error.message}`,
        timestamp: new Date(),
        resolved: false,
        metadata: { error: error.message }
      };

      workload.alerts.push(alert);
      this.emit('workloadFailed', { workloadId: workload.id, error: error.message });
      throw error;
    }
  }

  public async getWorkload(workloadId: string): Promise<QuantumWorkload | null> {
    return this.workloads.get(workloadId) || null;
  }

  public async getWorkloadsByTenant(tenantId: string): Promise<QuantumWorkload[]> {
    return Array.from(this.workloads.values()).filter(w => w.tenantId === tenantId);
  }

  public async updateWorkloadStatus(workloadId: string, status: WorkloadStatus): Promise<void> {
    const workload = this.workloads.get(workloadId);
    if (!workload) {
      throw new Error(`Workload not found: ${workloadId}`);
    }

    workload.status = status;
    workload.updatedAt = new Date();

    this.emit('workloadStatusUpdated', { workloadId, status });
    logger.info('Workload status updated', { workloadId, status });
  }

  public async scaleWorkload(workloadId: string, scalingConfig: WorkloadScalingConfig): Promise<void> {
    const startTime = Date.now();

    try {
      const workload = this.workloads.get(workloadId);
      if (!workload) {
        throw new Error(`Workload not found: ${workloadId}`);
      }

      // Implement scaling logic here
      // This would typically interact with Kubernetes or other orchestration systems

      this.emit('workloadScaled', {
        workloadId,
        scalingConfig,
        duration: Date.now() - startTime
      });

      logger.info('Workload scaled successfully', { workloadId, scalingConfig });
    } catch (error) {
      logger.error('Failed to scale workload', { workloadId, error: error.message });
      throw error;
    }
  }

  public async allocateQuantumResources(
    workloadId: string,
    allocation: QuantumResourceAllocation
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const workload = this.workloads.get(workloadId);
      if (!workload) {
        throw new Error(`Workload not found: ${workloadId}`);
      }

      // Update resource usage
      workload.resourceUsage.quantumBackendTime += allocation.estimatedDuration;
      workload.resourceUsage.estimatedCost += allocation.cost;
      workload.updatedAt = new Date();

      this.emit('quantumResourcesAllocated', {
        workloadId,
        allocation,
        duration: Date.now() - startTime
      });

      logger.info('Quantum resources allocated', { workloadId, allocation });
    } catch (error) {
      logger.error('Failed to allocate quantum resources', {
        workloadId,
        error: error.message
      });
      throw error;
    }
  }

  public async generateAlert(
    workloadId: string,
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<WorkloadAlert> {
    const workload = this.workloads.get(workloadId);
    if (!workload) {
      throw new Error(`Workload not found: ${workloadId}`);
    }

    const alert: WorkloadAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workloadId,
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    };

    workload.alerts.push(alert);
    workload.updatedAt = new Date();

    this.emit('alertGenerated', { workloadId, alert });
    logger.warn('Alert generated', { workloadId, alert });

    return alert;
  }

  public async resolveAlert(alertId: string): Promise<void> {
    for (const workload of this.workloads.values()) {
      const alert = workload.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        workload.updatedAt = new Date();

        this.emit('alertResolved', { workloadId: workload.id, alertId });
        logger.info('Alert resolved', { workloadId: workload.id, alertId });
        return;
      }
    }

    throw new Error(`Alert not found: ${alertId}`);
  }

  private async collectMetrics(): Promise<void> {
    try {
      for (const workload of this.workloads.values()) {
        if (workload.status === WorkloadStatus.RUNNING) {
          await this.updateWorkloadMetrics(workload);
        }
      }

      // Clear dashboard cache to force refresh
      this.dashboardCache.clear();

      this.emit('metricsCollected', { timestamp: new Date() });
    } catch (error) {
      logger.error('Failed to collect metrics', { error: error.message });
    }
  }

  private async updateWorkloadMetrics(workload: QuantumWorkload): Promise<void> {
    // Simulate metric updates with realistic quantum computing values
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

    // Update execution stats
    if (Math.random() < 0.1) { // 10% chance of new execution
      workload.executionStats.totalExecutions++;
      if (Math.random() < 0.95) { // 95% success rate
        workload.executionStats.successfulExecutions++;
      } else {
        workload.executionStats.failedExecutions++;
      }
    }

    // Update performance metrics
    workload.performance.fidelity = Math.min(0.99, 0.85 + Math.random() * 0.1) * randomFactor;
    workload.performance.errorRate = Math.max(0.001, 0.05 * (2 - randomFactor));
    workload.performance.throughput = 50 + Math.random() * 50 * randomFactor;
    workload.performance.latency = 100 + Math.random() * 200 / randomFactor;

    // Update resource usage
    workload.resourceUsage.cpuUtilization = Math.min(100, 60 + Math.random() * 30 * randomFactor);
    workload.resourceUsage.memoryUtilization = Math.min(100, 50 + Math.random() * 40 * randomFactor);
    workload.resourceUsage.quantumBackendTime += Math.random() * 10;

    // Update budget consumption
    const executionCost = Math.random() * 5 + 1;
    workload.budgetConsumption.consumedBudget += executionCost;
    workload.budgetConsumption.remainingBudget = Math.max(0,
      workload.budgetConsumption.totalBudget - workload.budgetConsumption.consumedBudget
    );
    workload.budgetConsumption.budgetUtilization =
      (workload.budgetConsumption.consumedBudget / workload.budgetConsumption.totalBudget) * 100;

    // Check for alerts
    await this.checkWorkloadAlerts(workload);

    workload.updatedAt = new Date();
  }

  private async checkWorkloadAlerts(workload: QuantumWorkload): Promise<void> {
    // Budget alerts
    if (workload.budgetConsumption.budgetUtilization >= this.config.budgetAlertThresholds.critical) {
      const existingAlert = workload.alerts.find(a =>
        a.type === AlertType.BUDGET_CRITICAL && !a.resolved
      );

      if (!existingAlert) {
        await this.generateAlert(
          workload.id,
          AlertType.BUDGET_CRITICAL,
          AlertSeverity.CRITICAL,
          `Budget utilization is at ${workload.budgetConsumption.budgetUtilization.toFixed(1)}%`,
          { budgetUtilization: workload.budgetConsumption.budgetUtilization }
        );
      }
    } else if (workload.budgetConsumption.budgetUtilization >= this.config.budgetAlertThresholds.warning) {
      const existingAlert = workload.alerts.find(a =>
        a.type === AlertType.BUDGET_WARNING && !a.resolved
      );

      if (!existingAlert) {
        await this.generateAlert(
          workload.id,
          AlertType.BUDGET_WARNING,
          AlertSeverity.WARNING,
          `Budget utilization is at ${workload.budgetConsumption.budgetUtilization.toFixed(1)}%`,
          { budgetUtilization: workload.budgetConsumption.budgetUtilization }
        );
      }
    }

    // Performance alerts
    if (workload.performance.fidelity < this.config.performanceThresholds.minFidelity) {
      const existingAlert = workload.alerts.find(a =>
        a.type === AlertType.PERFORMANCE_DEGRADATION && !a.resolved
      );

      if (!existingAlert) {
        await this.generateAlert(
          workload.id,
          AlertType.PERFORMANCE_DEGRADATION,
          AlertSeverity.WARNING,
          `Fidelity dropped to ${(workload.performance.fidelity * 100).toFixed(1)}%`,
          { fidelity: workload.performance.fidelity }
        );
      }
    }

    // Error rate alerts
    if (workload.performance.errorRate > this.config.performanceThresholds.maxErrorRate) {
      const existingAlert = workload.alerts.find(a =>
        a.type === AlertType.ERROR_RATE_HIGH && !a.resolved
      );

      if (!existingAlert) {
        await this.generateAlert(
          workload.id,
          AlertType.ERROR_RATE_HIGH,
          AlertSeverity.WARNING,
          `Error rate increased to ${(workload.performance.errorRate * 100).toFixed(2)}%`,
          { errorRate: workload.performance.errorRate }
        );
      }
    }
  }

  private isCacheValid(dashboard: WorkloadDashboard): boolean {
    // Cache is valid for the refresh interval duration
    const now = Date.now();
    const cacheAge = now - dashboard.overview.totalExecutions; // Using a field as timestamp proxy
    return cacheAge < this.config.dashboardRefreshInterval;
  }

  public async shutdown(): Promise<void> {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    this.dashboardCache.clear();
    this.workloads.clear();
    this.removeAllListeners();

    logger.info('TenantAppOpsService shutdown complete', { tenantId: this.config.tenantId });
  }
}