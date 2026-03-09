import { EventEmitter } from 'events';
import { promises as fs } from 'fs';

export interface Tenant {
  id: string;
  name: string;
  tier: 'gold' | 'silver' | 'bronze';
  namespace: string;
  quotas: TenantQuota;
  budgets: TenantBudget;
  priority: number; // 1-10, higher = more priority
  contacts: TenantContact[];
  created: Date;
  active: boolean;
}

export interface TenantQuota {
  cpuCoresPerHour: number;
  memoryGBPerHour: number;
  storageGB: number;
  networkGBPerDay: number;
  concurrentBuilds: number;
  buildsPerDay: number;
  artifactRetentionDays: number;
}

export interface TenantBudget {
  monthlyBudgetUSD: number;
  dailyBudgetUSD: number;
  currentSpendUSD: number;
  alertThresholds: AlertThreshold[];
  hardLimits: boolean;
  resetDay: number; // Day of month for budget reset
}

export interface AlertThreshold {
  percentage: number; // 0-100
  channels: string[]; // email, slack, pagerduty
  escalation: boolean;
}

export interface TenantContact {
  name: string;
  email: string;
  role: 'admin' | 'billing' | 'technical';
  notifications: string[]; // quota, budget, incidents
}

export interface BuildRequest {
  id: string;
  tenantId: string;
  priority: number;
  estimatedCpuHours: number;
  estimatedMemoryGB: number;
  estimatedDurationMinutes: number;
  targets: string[];
  requiredResources: ResourceRequirement[];
  submittedAt: Date;
  deadline?: Date;
}

export interface ResourceRequirement {
  type: 'cpu' | 'memory' | 'disk' | 'gpu' | 'network';
  amount: number;
  unit: string;
  required: boolean;
}

export interface SchedulingDecision {
  requestId: string;
  tenantId: string;
  action: 'schedule' | 'queue' | 'reject';
  reason: string;
  scheduledAt?: Date;
  estimatedStart?: Date;
  queuePosition?: number;
  priority: number;
  resourceAllocation?: ResourceAllocation;
}

export interface ResourceAllocation {
  cpuCores: number;
  memoryGB: number;
  diskGB: number;
  networkMbps: number;
  region: string;
  nodeType: string;
  estimatedCostUSD: number;
}

export interface QueueMetrics {
  tenantId: string;
  queueLength: number;
  averageWaitTime: number;
  p50WaitTime: number;
  p95WaitTime: number;
  p99WaitTime: number;
  throughput: number; // builds per hour
  priority: number;
}

export interface FairShareState {
  tenantId: string;
  allocatedShare: number; // 0-1, percentage of total resources
  actualUsage: number; // 0-1, actual usage percentage
  debt: number; // negative = owed resources, positive = overused
  priority: number;
  lastUpdate: Date;
}

export class MultiTenantScheduler extends EventEmitter {
  private tenants: Map<string, Tenant> = new Map();
  private buildQueue: BuildRequest[] = [];
  private fairShareState: Map<string, FairShareState> = new Map();
  private resourcePool: ResourcePool;
  private schedulingInterval: NodeJS.Timeout | null = null;

  constructor(private config: SchedulerConfig) {
    super();
    this.resourcePool = {
      totalCpuCores: config.totalCpuCores || 1000,
      totalMemoryGB: config.totalMemoryGB || 4000,
      totalDiskGB: config.totalDiskGB || 50000,
      availableCpuCores: config.totalCpuCores || 1000,
      availableMemoryGB: config.totalMemoryGB || 4000,
      availableDiskGB: config.totalDiskGB || 50000,
    };

    this.startSchedulingLoop();
  }

  async addTenant(tenant: Tenant): Promise<void> {
    this.tenants.set(tenant.id, tenant);

    // Initialize fair share state
    this.fairShareState.set(tenant.id, {
      tenantId: tenant.id,
      allocatedShare: this.calculateInitialShare(tenant),
      actualUsage: 0,
      debt: 0,
      priority: tenant.priority,
      lastUpdate: new Date(),
    });

    this.emit('tenant-added', tenant);
  }

  async updateTenant(
    tenantId: string,
    updates: Partial<Tenant>,
  ): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    Object.assign(tenant, updates);
    this.tenants.set(tenantId, tenant);

    // Update fair share if priority changed
    if (updates.priority !== undefined) {
      const fairShare = this.fairShareState.get(tenantId);
      if (fairShare) {
        fairShare.priority = updates.priority;
        fairShare.allocatedShare = this.calculateInitialShare(tenant);
      }
    }

    this.emit('tenant-updated', { tenantId, updates });
  }

  async submitBuildRequest(request: BuildRequest): Promise<SchedulingDecision> {
    const tenant = this.tenants.get(request.tenantId);
    if (!tenant) {
      return {
        requestId: request.id,
        tenantId: request.tenantId,
        action: 'reject',
        reason: 'Unknown tenant',
        priority: 0,
      };
    }

    // Check tenant quotas
    const quotaCheck = await this.checkTenantQuotas(tenant, request);
    if (!quotaCheck.allowed) {
      return {
        requestId: request.id,
        tenantId: request.tenantId,
        action: 'reject',
        reason: quotaCheck.reason,
        priority: 0,
      };
    }

    // Check budget limits
    const budgetCheck = await this.checkBudgetLimits(tenant, request);
    if (!budgetCheck.allowed) {
      return {
        requestId: request.id,
        tenantId: request.tenantId,
        action: 'reject',
        reason: budgetCheck.reason,
        priority: 0,
      };
    }

    // Calculate priority score
    const priorityScore = this.calculatePriorityScore(tenant, request);
    request.priority = priorityScore;

    // Add to queue
    this.buildQueue.push(request);
    this.sortQueue();

    const queuePosition =
      this.buildQueue.findIndex((r) => r.id === request.id) + 1;
    const estimatedStart = this.estimateStartTime(queuePosition, request);

    this.emit('build-queued', {
      requestId: request.id,
      tenantId: request.tenantId,
      queuePosition,
      estimatedStart,
    });

    return {
      requestId: request.id,
      tenantId: request.tenantId,
      action: 'queue',
      reason: 'Added to build queue',
      scheduledAt: new Date(),
      estimatedStart,
      queuePosition,
      priority: priorityScore,
    };
  }

  async getQueueMetrics(): Promise<QueueMetrics[]> {
    const metrics: QueueMetrics[] = [];

    for (const tenant of this.tenants.values()) {
      const tenantRequests = this.buildQueue.filter(
        (r) => r.tenantId === tenant.id,
      );
      const waitTimes = tenantRequests.map(
        (r) => Date.now() - r.submittedAt.getTime(),
      );

      waitTimes.sort((a, b) => a - b);

      metrics.push({
        tenantId: tenant.id,
        queueLength: tenantRequests.length,
        averageWaitTime:
          waitTimes.length > 0
            ? waitTimes.reduce((sum, time) => sum + time, 0) /
              waitTimes.length /
              1000 /
              60
            : 0,
        p50WaitTime:
          waitTimes.length > 0
            ? waitTimes[Math.floor(waitTimes.length * 0.5)] / 1000 / 60
            : 0,
        p95WaitTime:
          waitTimes.length > 0
            ? waitTimes[Math.floor(waitTimes.length * 0.95)] / 1000 / 60
            : 0,
        p99WaitTime:
          waitTimes.length > 0
            ? waitTimes[Math.floor(waitTimes.length * 0.99)] / 1000 / 60
            : 0,
        throughput: this.calculateThroughput(tenant.id),
        priority: tenant.priority,
      });
    }

    return metrics.sort((a, b) => b.priority - a.priority);
  }

  async getFairShareReport(): Promise<FairShareReport> {
    const states = Array.from(this.fairShareState.values());

    return {
      timestamp: new Date(),
      totalResources: this.resourcePool,
      tenantStates: states,
      inequityScore: this.calculateInequityScore(states),
      recommendations: this.generateFairShareRecommendations(states),
    };
  }

  async rebalanceFairShare(): Promise<void> {
    this.emit('rebalance-start');

    const states = Array.from(this.fairShareState.values());
    const totalPriority = states.reduce(
      (sum, state) => sum + state.priority,
      0,
    );

    // Recalculate allocations based on current priorities and usage
    for (const state of states) {
      const targetShare = state.priority / totalPriority;
      const usageDelta = state.actualUsage - state.allocatedShare;

      // Update debt (simplified fair share algorithm)
      state.debt = state.debt * 0.9 + usageDelta * 0.1;

      // Adjust allocation to account for debt
      state.allocatedShare = Math.max(0.01, targetShare - state.debt * 0.5);
      state.lastUpdate = new Date();
    }

    // Normalize allocations to sum to 1.0
    const totalAllocation = states.reduce(
      (sum, state) => sum + state.allocatedShare,
      0,
    );
    for (const state of states) {
      state.allocatedShare = state.allocatedShare / totalAllocation;
    }

    this.emit('rebalance-complete', states);
  }

  async triggerBudgetAlert(
    tenantId: string,
    spendPercentage: number,
  ): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return;

    const relevantThresholds = tenant.budgets.alertThresholds.filter(
      (threshold) => spendPercentage >= threshold.percentage,
    );

    for (const threshold of relevantThresholds) {
      await this.sendBudgetAlert(tenant, threshold, spendPercentage);
    }

    this.emit('budget-alert-sent', {
      tenantId,
      spendPercentage,
      thresholds: relevantThresholds.length,
    });
  }

  private async scheduleNextBuilds(): Promise<void> {
    if (this.buildQueue.length === 0) return;

    const availableResources = this.getAvailableResources();
    const scheduledBuilds: BuildRequest[] = [];

    // Use weighted fair queuing to select builds
    const sortedQueue = this.appleFairQueueing();

    for (const request of sortedQueue) {
      const allocation = this.calculateResourceAllocation(
        request,
        availableResources,
      );

      if (allocation && this.canSchedule(allocation, availableResources)) {
        scheduledBuilds.push(request);
        this.allocateResources(allocation, availableResources);

        // Update fair share usage
        const fairShare = this.fairShareState.get(request.tenantId);
        if (fairShare) {
          const resourceUsage =
            allocation.cpuCores / this.resourcePool.totalCpuCores;
          fairShare.actualUsage =
            fairShare.actualUsage * 0.9 + resourceUsage * 0.1;
        }

        this.emit('build-scheduled', {
          requestId: request.id,
          tenantId: request.tenantId,
          allocation,
        });
      }
    }

    // Remove scheduled builds from queue
    this.buildQueue = this.buildQueue.filter(
      (request) =>
        !scheduledBuilds.some((scheduled) => scheduled.id === request.id),
    );
  }

  private appleFairQueueing(): BuildRequest[] {
    // Implement weighted fair queuing based on tenant priorities and fair share state
    const queueByTenant = new Map<string, BuildRequest[]>();

    // Group requests by tenant
    for (const request of this.buildQueue) {
      if (!queueByTenant.has(request.tenantId)) {
        queueByTenant.set(request.tenantId, []);
      }
      queueByTenant.get(request.tenantId)!.push(request);
    }

    // Calculate virtual time for each tenant queue
    const tenantVirtualTimes = new Map<string, number>();
    for (const [tenantId, requests] of queueByTenant) {
      const fairShare = this.fairShareState.get(tenantId);
      const weight = fairShare ? fairShare.allocatedShare : 0.1;

      // Virtual time increases inversely with weight (higher weight = slower virtual time)
      const virtualTime = Date.now() / (weight * 1000);
      tenantVirtualTimes.set(tenantId, virtualTime);
    }

    // Interleave requests from tenant queues based on virtual time
    const result: BuildRequest[] = [];
    while (queueByTenant.size > 0) {
      // Find tenant with minimum virtual time
      let minTenant = '';
      let minTime = Infinity;

      for (const [tenantId] of queueByTenant) {
        const virtualTime = tenantVirtualTimes.get(tenantId) || 0;
        if (virtualTime < minTime) {
          minTime = virtualTime;
          minTenant = tenantId;
        }
      }

      // Take one request from the min tenant
      const tenantQueue = queueByTenant.get(minTenant)!;
      const nextRequest = tenantQueue.shift()!;
      result.push(nextRequest);

      // Update virtual time
      const fairShare = this.fairShareState.get(minTenant);
      const weight = fairShare ? fairShare.allocatedShare : 0.1;
      const newVirtualTime =
        minTime + nextRequest.estimatedDurationMinutes / weight;
      tenantVirtualTimes.set(minTenant, newVirtualTime);

      // Remove tenant if queue is empty
      if (tenantQueue.length === 0) {
        queueByTenant.delete(minTenant);
      }
    }

    return result;
  }

  private calculatePriorityScore(
    tenant: Tenant,
    request: BuildRequest,
  ): number {
    let score = tenant.priority * 10; // Base score from tenant priority

    // Boost for deadlines
    if (request.deadline) {
      const timeToDeadline = request.deadline.getTime() - Date.now();
      const urgencyBoost = Math.max(0, 50 - timeToDeadline / 60000); // Up to 50 points for urgent
      score += urgencyBoost;
    }

    // Fair share adjustment
    const fairShare = this.fairShareState.get(tenant.id);
    if (fairShare && fairShare.debt < 0) {
      score += Math.abs(fairShare.debt) * 20; // Boost for tenants owed resources
    }

    // Tier-based multiplier
    const tierMultipliers = { gold: 1.5, silver: 1.2, bronze: 1.0 };
    score *= tierMultipliers[tenant.tier];

    return Math.round(score);
  }

  private async checkTenantQuotas(
    tenant: Tenant,
    request: BuildRequest,
  ): Promise<{ allowed: boolean; reason: string }> {
    // Check concurrent builds
    const activeBuildCount = await this.getActiveBuildCount(tenant.id);
    if (activeBuildCount >= tenant.quotas.concurrentBuilds) {
      return {
        allowed: false,
        reason: `Concurrent build limit reached (${tenant.quotas.concurrentBuilds})`,
      };
    }

    // Check daily build limit
    const todayBuildCount = await this.getTodayBuildCount(tenant.id);
    if (todayBuildCount >= tenant.quotas.buildsPerDay) {
      return {
        allowed: false,
        reason: `Daily build limit reached (${tenant.quotas.buildsPerDay})`,
      };
    }

    // Check resource quotas
    if (request.estimatedCpuHours > tenant.quotas.cpuCoresPerHour) {
      return {
        allowed: false,
        reason: `CPU quota exceeded (${tenant.quotas.cpuCoresPerHour} cores/hour)`,
      };
    }

    if (request.estimatedMemoryGB > tenant.quotas.memoryGBPerHour) {
      return {
        allowed: false,
        reason: `Memory quota exceeded (${tenant.quotas.memoryGBPerHour} GB/hour)`,
      };
    }

    return { allowed: true, reason: 'Quotas OK' };
  }

  private async checkBudgetLimits(
    tenant: Tenant,
    request: BuildRequest,
  ): Promise<{ allowed: boolean; reason: string }> {
    const estimatedCost = this.estimateBuildCost(request);

    // Check hard budget limits
    if (tenant.budgets.hardLimits) {
      const dailyRemaining =
        tenant.budgets.dailyBudgetUSD -
        (tenant.budgets.currentSpendUSD % tenant.budgets.dailyBudgetUSD);
      if (estimatedCost > dailyRemaining) {
        return {
          allowed: false,
          reason: `Daily budget limit would be exceeded ($${dailyRemaining.toFixed(2)} remaining)`,
        };
      }

      const monthlyRemaining =
        tenant.budgets.monthlyBudgetUSD - tenant.budgets.currentSpendUSD;
      if (estimatedCost > monthlyRemaining) {
        return {
          allowed: false,
          reason: `Monthly budget limit would be exceeded ($${monthlyRemaining.toFixed(2)} remaining)`,
        };
      }
    }

    return { allowed: true, reason: 'Budget OK' };
  }

  private estimateBuildCost(request: BuildRequest): number {
    // Simplified cost calculation: $0.05 per CPU-hour, $0.01 per GB-hour
    const cpuCost = request.estimatedCpuHours * 0.05;
    const memoryCost =
      request.estimatedMemoryGB *
      (request.estimatedDurationMinutes / 60) *
      0.01;
    return cpuCost + memoryCost;
  }

  private calculateInitialShare(tenant: Tenant): number {
    // Base share calculation on priority and tier
    const basePriority = tenant.priority;
    const tierMultiplier = { gold: 1.5, silver: 1.2, bronze: 1.0 }[tenant.tier];
    return (basePriority * tierMultiplier) / 100; // Normalize to reasonable range
  }

  private sortQueue(): void {
    this.buildQueue.sort((a, b) => b.priority - a.priority);
  }

  private estimateStartTime(
    queuePosition: number,
    request: BuildRequest,
  ): Date {
    // Simplified estimation based on queue position and average build time
    const avgBuildTimeMinutes = 15;
    const estimatedMinutes = queuePosition * avgBuildTimeMinutes;
    return new Date(Date.now() + estimatedMinutes * 60000);
  }

  private calculateThroughput(tenantId: string): number {
    // Simplified throughput calculation - would use actual historical data
    return Math.random() * 10; // 0-10 builds per hour
  }

  private getAvailableResources(): ResourcePool {
    return { ...this.resourcePool };
  }

  private calculateResourceAllocation(
    request: BuildRequest,
    available: ResourcePool,
  ): ResourceAllocation | null {
    const cpuCores = Math.min(
      request.estimatedCpuHours,
      available.availableCpuCores,
    );
    const memoryGB = Math.min(
      request.estimatedMemoryGB,
      available.availableMemoryGB,
    );

    if (cpuCores < 1 || memoryGB < 1) return null;

    return {
      cpuCores,
      memoryGB,
      diskGB: Math.min(100, available.availableDiskGB), // Default 100GB
      networkMbps: 1000, // Default 1Gbps
      region: 'us-east-1', // Default region
      nodeType: 'standard',
      estimatedCostUSD: this.estimateBuildCost(request),
    };
  }

  private canSchedule(
    allocation: ResourceAllocation,
    available: ResourcePool,
  ): boolean {
    return (
      allocation.cpuCores <= available.availableCpuCores &&
      allocation.memoryGB <= available.availableMemoryGB &&
      allocation.diskGB <= available.availableDiskGB
    );
  }

  private allocateResources(
    allocation: ResourceAllocation,
    available: ResourcePool,
  ): void {
    available.availableCpuCores -= allocation.cpuCores;
    available.availableMemoryGB -= allocation.memoryGB;
    available.availableDiskGB -= allocation.diskGB;
  }

  private calculateInequityScore(states: FairShareState[]): number {
    // Calculate Gini coefficient for resource distribution
    const usages = states.map((s) => s.actualUsage).sort((a, b) => a - b);
    const n = usages.length;
    let sum = 0;

    for (let i = 0; i < n; i++) {
      sum += (2 * (i + 1) - n - 1) * usages[i];
    }

    const mean = usages.reduce((sum, usage) => sum + usage, 0) / n;
    return sum / (n * n * mean);
  }

  private generateFairShareRecommendations(states: FairShareState[]): string[] {
    const recommendations = [];
    const maxDebt = Math.max(...states.map((s) => Math.abs(s.debt)));

    if (maxDebt > 0.2) {
      recommendations.push(
        'Consider rebalancing resource allocations - high debt detected',
      );
    }

    const underutilized = states.filter(
      (s) => s.actualUsage < s.allocatedShare * 0.5,
    );
    if (underutilized.length > 0) {
      recommendations.push(
        `${underutilized.length} tenant(s) significantly underutilizing resources`,
      );
    }

    const overutilized = states.filter(
      (s) => s.actualUsage > s.allocatedShare * 1.5,
    );
    if (overutilized.length > 0) {
      recommendations.push(
        `${overutilized.length} tenant(s) significantly overutilizing resources`,
      );
    }

    return recommendations;
  }

  private async sendBudgetAlert(
    tenant: Tenant,
    threshold: AlertThreshold,
    spendPercentage: number,
  ): Promise<void> {
    const message = `Budget alert: ${tenant.name} has spent ${spendPercentage.toFixed(1)}% of monthly budget ($${tenant.budgets.currentSpendUSD.toFixed(2)} of $${tenant.budgets.monthlyBudgetUSD})`;

    // Simulate sending alerts via various channels
    for (const channel of threshold.channels) {
      this.emit('alert-sent', {
        tenantId: tenant.id,
        channel,
        message,
        escalation: threshold.escalation,
      });
    }
  }

  private async getActiveBuildCount(tenantId: string): Promise<number> {
    // Simplified - would query actual build system
    return Math.floor(Math.random() * 5);
  }

  private async getTodayBuildCount(tenantId: string): Promise<number> {
    // Simplified - would query actual build system
    return Math.floor(Math.random() * 50);
  }

  private startSchedulingLoop(): void {
    this.schedulingInterval = setInterval(async () => {
      try {
        await this.scheduleNextBuilds();
        await this.rebalanceFairShare();
      } catch (error) {
        this.emit(
          'scheduling-error',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }, 10000); // Every 10 seconds
  }

  async stop(): Promise<void> {
    if (this.schedulingInterval) {
      clearInterval(this.schedulingInterval);
      this.schedulingInterval = null;
    }
    this.emit('scheduler-stopped');
  }
}

// Supporting interfaces
interface SchedulerConfig {
  totalCpuCores: number;
  totalMemoryGB: number;
  totalDiskGB: number;
}

interface ResourcePool {
  totalCpuCores: number;
  totalMemoryGB: number;
  totalDiskGB: number;
  availableCpuCores: number;
  availableMemoryGB: number;
  availableDiskGB: number;
}

interface FairShareReport {
  timestamp: Date;
  totalResources: ResourcePool;
  tenantStates: FairShareState[];
  inequityScore: number;
  recommendations: string[];
}
