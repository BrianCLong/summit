/**
 * Adaptive Sampling Engine
 *
 * Implements intelligent sampling strategies for observability data
 * to balance cost control with data quality and system visibility.
 */

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

interface SamplingRule {
  id: string;
  name: string;
  priority: number;
  conditions: SamplingCondition[];
  action: SamplingAction;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SamplingCondition {
  type: 'service' | 'operation' | 'status' | 'duration' | 'error' | 'cost' | 'load';
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'regex';
  field: string;
  value: any;
}

interface SamplingAction {
  type: 'sample' | 'drop' | 'force_sample';
  rate: number; // 0-1 for sample rate, ignored for drop/force_sample
  tags?: Record<string, string>;
}

interface SamplingContext {
  service: string;
  operation: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  duration: number;
  status: 'ok' | 'error' | 'timeout';
  tags: Record<string, string>;
  timestamp: Date;
  cost?: number;
}

interface SamplingDecision {
  sample: boolean;
  rate: number;
  reason: string;
  ruleId?: string;
  tags?: Record<string, string>;
}

interface SamplingStats {
  service: string;
  operation: string;
  totalCount: number;
  sampledCount: number;
  droppedCount: number;
  effectiveRate: number;
  costSavings: number;
  lastUpdated: Date;
}

export class AdaptiveSampler extends EventEmitter {
  private redis: Redis;
  private rules: Map<string, SamplingRule>;
  private stats: Map<string, SamplingStats>;
  private defaultRates: Map<string, number>;
  private adaptiveRates: Map<string, number>;
  private loadThresholds: Map<string, number>;

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.rules = new Map();
    this.stats = new Map();
    this.defaultRates = new Map();
    this.adaptiveRates = new Map();
    this.loadThresholds = new Map();

    this.initializeDefaultRates();
    this.loadRulesFromRedis();
    this.startPeriodicTasks();
  }

  // Initialize default sampling rates by service/operation
  private initializeDefaultRates(): void {
    // High-value operations - always sample
    this.defaultRates.set('gateway:authentication', 1.0);
    this.defaultRates.set('gateway:authorization', 1.0);
    this.defaultRates.set('er:adjudication', 1.0);
    this.defaultRates.set('payments:transaction', 1.0);

    // Critical paths - high sampling
    this.defaultRates.set('gateway:graphql', 0.8);
    this.defaultRates.set('neo4j:query', 0.7);
    this.defaultRates.set('ai:inference', 0.6);

    // Standard operations - moderate sampling
    this.defaultRates.set('api:read', 0.3);
    this.defaultRates.set('api:write', 0.5);
    this.defaultRates.set('search:query', 0.4);

    // High-volume, low-value operations - low sampling
    this.defaultRates.set('health:check', 0.05);
    this.defaultRates.set('metrics:collection', 0.02);
    this.defaultRates.set('logs:ingestion', 0.01);

    // Set load thresholds for adaptive sampling
    this.loadThresholds.set('cpu', 70); // 70% CPU
    this.loadThresholds.set('memory', 80); // 80% Memory
    this.loadThresholds.set('requests', 1000); // 1000 RPS
    this.loadThresholds.set('errors', 5); // 5% error rate
  }

  // Make sampling decision for a trace/span
  async shouldSample(context: SamplingContext): Promise<SamplingDecision> {
    try {
      // Always sample errors and high-cost operations
      if (context.status === 'error') {
        return {
          sample: true,
          rate: 1.0,
          reason: 'Error sampling - always sample errors',
          tags: { sampling_reason: 'error' }
        };
      }

      if (context.cost && context.cost > 10) {
        return {
          sample: true,
          rate: 1.0,
          reason: 'High-cost operation sampling',
          tags: { sampling_reason: 'high_cost', cost: context.cost.toString() }
        };
      }

      // Check sampling rules in priority order
      const ruleDecision = await this.applyRules(context);
      if (ruleDecision) {
        return ruleDecision;
      }

      // Apply adaptive sampling based on current load
      const adaptiveDecision = await this.applyAdaptiveSampling(context);
      if (adaptiveDecision) {
        return adaptiveDecision;
      }

      // Fall back to default rate
      const operationKey = `${context.service}:${context.operation}`;
      const defaultRate = this.defaultRates.get(operationKey) || 0.1;

      const shouldSample = Math.random() < defaultRate;

      return {
        sample: shouldSample,
        rate: defaultRate,
        reason: `Default sampling rate for ${operationKey}`,
        tags: { sampling_reason: 'default' }
      };

    } catch (error) {
      logger.error('Sampling decision failed', {
        error: error.message,
        context,
        stack: error.stack
      });

      // Fail safe - use conservative sampling
      return {
        sample: Math.random() < 0.1,
        rate: 0.1,
        reason: 'Fallback sampling due to error'
      };
    }
  }

  // Apply sampling rules
  private async applyRules(context: SamplingContext): Promise<SamplingDecision | null> {
    const sortedRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (await this.evaluateConditions(rule.conditions, context)) {
        const decision = this.executeAction(rule.action, context);
        decision.ruleId = rule.id;
        decision.reason = `Rule: ${rule.name}`;

        logger.debug('Sampling rule applied', {
          ruleId: rule.id,
          ruleName: rule.name,
          decision: decision.sample,
          rate: decision.rate
        });

        return decision;
      }
    }

    return null;
  }

  // Apply adaptive sampling based on system load
  private async applyAdaptiveSampling(context: SamplingContext): Promise<SamplingDecision | null> {
    try {
      const [cpuLoad, memoryLoad, errorRate, requestRate] = await Promise.all([
        this.getCurrentLoad('cpu'),
        this.getCurrentLoad('memory'),
        this.getCurrentErrorRate(context.service),
        this.getCurrentRequestRate(context.service)
      ]);

      // Calculate load factor (0-1, where 1 = maximum load)
      const loadFactor = Math.max(
        cpuLoad / this.loadThresholds.get('cpu')!,
        memoryLoad / this.loadThresholds.get('memory')!,
        requestRate / this.loadThresholds.get('requests')!,
        errorRate / this.loadThresholds.get('errors')!
      );

      // Reduce sampling rate under high load
      if (loadFactor > 1.0) {
        const operationKey = `${context.service}:${context.operation}`;
        const baseRate = this.defaultRates.get(operationKey) || 0.1;
        const adaptiveRate = Math.max(0.01, baseRate * (1 / loadFactor));

        this.adaptiveRates.set(operationKey, adaptiveRate);

        const shouldSample = Math.random() < adaptiveRate;

        return {
          sample: shouldSample,
          rate: adaptiveRate,
          reason: `Adaptive sampling due to high load (factor: ${loadFactor.toFixed(2)})`,
          tags: {
            sampling_reason: 'adaptive',
            load_factor: loadFactor.toFixed(2),
            cpu_load: cpuLoad.toString(),
            memory_load: memoryLoad.toString(),
            error_rate: errorRate.toString(),
            request_rate: requestRate.toString()
          }
        };
      }

      return null;

    } catch (error) {
      logger.error('Adaptive sampling failed', {
        error: error.message,
        context
      });
      return null;
    }
  }

  // Evaluate sampling rule conditions
  private async evaluateConditions(conditions: SamplingCondition[], context: SamplingContext): Promise<boolean> {
    for (const condition of conditions) {
      if (!await this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  // Evaluate individual condition
  private async evaluateCondition(condition: SamplingCondition, context: SamplingContext): Promise<boolean> {
    let value: any;

    switch (condition.field) {
      case 'service':
        value = context.service;
        break;
      case 'operation':
        value = context.operation;
        break;
      case 'status':
        value = context.status;
        break;
      case 'duration':
        value = context.duration;
        break;
      case 'cost':
        value = context.cost || 0;
        break;
      case 'error_rate':
        value = await this.getCurrentErrorRate(context.service);
        break;
      case 'request_rate':
        value = await this.getCurrentRequestRate(context.service);
        break;
      default:
        // Check tags
        value = context.tags[condition.field];
        if (value === undefined) {
          return false;
        }
    }

    return this.compareValues(value, condition.operator, condition.value);
  }

  // Compare values based on operator
  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'ne':
        return actual !== expected;
      case 'gt':
        return actual > expected;
      case 'lt':
        return actual < expected;
      case 'gte':
        return actual >= expected;
      case 'lte':
        return actual <= expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'contains':
        return typeof actual === 'string' && actual.includes(expected);
      case 'regex':
        return typeof actual === 'string' && new RegExp(expected).test(actual);
      default:
        return false;
    }
  }

  // Execute sampling action
  private executeAction(action: SamplingAction, context: SamplingContext): SamplingDecision {
    switch (action.type) {
      case 'sample':
        return {
          sample: Math.random() < action.rate,
          rate: action.rate,
          reason: `Sample action with rate ${action.rate}`,
          tags: action.tags
        };

      case 'drop':
        return {
          sample: false,
          rate: 0,
          reason: 'Drop action - never sample',
          tags: action.tags
        };

      case 'force_sample':
        return {
          sample: true,
          rate: 1.0,
          reason: 'Force sample action - always sample',
          tags: action.tags
        };

      default:
        return {
          sample: false,
          rate: 0,
          reason: 'Unknown action type'
        };
    }
  }

  // Update sampling statistics
  async updateStats(context: SamplingContext, decision: SamplingDecision): Promise<void> {
    try {
      const key = `${context.service}:${context.operation}`;
      let stats = this.stats.get(key);

      if (!stats) {
        stats = {
          service: context.service,
          operation: context.operation,
          totalCount: 0,
          sampledCount: 0,
          droppedCount: 0,
          effectiveRate: 0,
          costSavings: 0,
          lastUpdated: new Date()
        };
        this.stats.set(key, stats);
      }

      stats.totalCount++;
      stats.lastUpdated = new Date();

      if (decision.sample) {
        stats.sampledCount++;
      } else {
        stats.droppedCount++;
        // Estimate cost savings (assuming $0.001 per trace)
        stats.costSavings += 0.001;
      }

      stats.effectiveRate = stats.sampledCount / stats.totalCount;

      // Store in Redis for persistence
      await this.redis.setex(
        `sampling:stats:${key}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(stats)
      );

      // Emit stats update event
      this.emit('statsUpdate', { key, stats, decision });

    } catch (error) {
      logger.error('Failed to update sampling stats', {
        error: error.message,
        context,
        decision
      });
    }
  }

  // Create sampling rule
  async createRule(rule: Omit<SamplingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ruleId = this.generateId();
    const fullRule: SamplingRule = {
      ...rule,
      id: ruleId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(ruleId, fullRule);

    // Store in Redis
    await this.redis.setex(
      `sampling:rule:${ruleId}`,
      365 * 24 * 60 * 60, // 1 year
      JSON.stringify(fullRule)
    );

    logger.info('Sampling rule created', {
      ruleId,
      name: rule.name,
      priority: rule.priority,
      enabled: rule.enabled
    });

    return ruleId;
  }

  // Get sampling statistics
  async getSamplingStats(timeRange: string = '24h'): Promise<any> {
    try {
      const allStats = Array.from(this.stats.values());

      const summary = {
        totalOperations: allStats.length,
        totalTraces: allStats.reduce((sum, stat) => sum + stat.totalCount, 0),
        totalSampled: allStats.reduce((sum, stat) => sum + stat.sampledCount, 0),
        totalDropped: allStats.reduce((sum, stat) => sum + stat.droppedCount, 0),
        totalCostSavings: allStats.reduce((sum, stat) => sum + stat.costSavings, 0),
        averageRate: allStats.reduce((sum, stat) => sum + stat.effectiveRate, 0) / allStats.length
      };

      const byService = this.groupStatsByService(allStats);
      const topCostSavers = allStats
        .sort((a, b) => b.costSavings - a.costSavings)
        .slice(0, 10);

      return {
        summary,
        byService,
        topCostSavers,
        rules: Array.from(this.rules.values()),
        adaptiveRates: Object.fromEntries(this.adaptiveRates),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get sampling stats', {
        error: error.message,
        timeRange
      });
      throw error;
    }
  }

  // Optimize sampling rates based on historical data
  async optimizeSamplingRates(): Promise<void> {
    try {
      const allStats = Array.from(this.stats.values());

      for (const stats of allStats) {
        const key = `${stats.service}:${stats.operation}`;
        const currentRate = this.defaultRates.get(key) || 0.1;

        // Calculate optimal rate based on error detection and cost
        let optimalRate = currentRate;

        // Increase rate for operations with errors
        const recentErrorRate = await this.getCurrentErrorRate(stats.service);
        if (recentErrorRate > 1) { // > 1% error rate
          optimalRate = Math.min(1.0, currentRate * 1.5);
        }

        // Decrease rate for high-volume, low-value operations
        if (stats.totalCount > 10000 && stats.costSavings > 10) {
          optimalRate = Math.max(0.01, currentRate * 0.8);
        }

        if (Math.abs(optimalRate - currentRate) > 0.05) {
          this.defaultRates.set(key, optimalRate);
          logger.info('Sampling rate optimized', {
            operation: key,
            oldRate: currentRate,
            newRate: optimalRate,
            errorRate: recentErrorRate,
            volume: stats.totalCount
          });
        }
      }

    } catch (error) {
      logger.error('Failed to optimize sampling rates', {
        error: error.message
      });
    }
  }

  // Start periodic tasks
  private startPeriodicTasks(): void {
    // Stats aggregation every 5 minutes
    setInterval(async () => {
      try {
        await this.aggregateStats();
      } catch (error) {
        logger.error('Stats aggregation failed', { error: error.message });
      }
    }, 5 * 60 * 1000);

    // Rate optimization every hour
    setInterval(async () => {
      try {
        await this.optimizeSamplingRates();
      } catch (error) {
        logger.error('Rate optimization failed', { error: error.message });
      }
    }, 60 * 60 * 1000);

    // Rules reload every 10 minutes
    setInterval(async () => {
      try {
        await this.loadRulesFromRedis();
      } catch (error) {
        logger.error('Rules reload failed', { error: error.message });
      }
    }, 10 * 60 * 1000);
  }

  // Helper methods
  private async loadRulesFromRedis(): Promise<void> {
    try {
      const keys = await this.redis.keys('sampling:rule:*');

      for (const key of keys) {
        const ruleData = await this.redis.get(key);
        if (ruleData) {
          const rule = JSON.parse(ruleData);
          this.rules.set(rule.id, rule);
        }
      }

    } catch (error) {
      logger.error('Failed to load rules from Redis', { error: error.message });
    }
  }

  private async getCurrentLoad(metric: string): Promise<number> {
    // Implementation would get current system load
    return Math.random() * 100; // Placeholder
  }

  private async getCurrentErrorRate(service: string): Promise<number> {
    // Implementation would get current error rate for service
    return Math.random() * 10; // Placeholder
  }

  private async getCurrentRequestRate(service: string): Promise<number> {
    // Implementation would get current request rate for service
    return Math.random() * 1000; // Placeholder
  }

  private groupStatsByService(stats: SamplingStats[]): Record<string, any> {
    const grouped: Record<string, any> = {};

    for (const stat of stats) {
      if (!grouped[stat.service]) {
        grouped[stat.service] = {
          service: stat.service,
          totalCount: 0,
          sampledCount: 0,
          droppedCount: 0,
          costSavings: 0,
          operations: []
        };
      }

      const serviceStats = grouped[stat.service];
      serviceStats.totalCount += stat.totalCount;
      serviceStats.sampledCount += stat.sampledCount;
      serviceStats.droppedCount += stat.droppedCount;
      serviceStats.costSavings += stat.costSavings;
      serviceStats.operations.push({
        operation: stat.operation,
        effectiveRate: stat.effectiveRate,
        totalCount: stat.totalCount
      });
    }

    return grouped;
  }

  private async aggregateStats(): Promise<void> {
    // Implementation would aggregate and persist stats
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}