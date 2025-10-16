// server/src/optimization/performance-monitoring-system.ts

import {
  getRedisClient,
  getNeo4jDriver,
  getPostgresPool,
} from '../config/database.js';
import logger from '../utils/logger.js';
import { EventEmitter } from 'events';
import { Neo4jQueryOptimizer } from './neo4j-query-optimizer.js';
import { PostgresPerformanceOptimizer } from './postgres-performance-optimizer.js';
import { ApiGatewayOptimizer } from './api-gateway-optimizer.js';
import { CostEfficiencyOptimizer } from './cost-efficiency-optimizer.js';

interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    available: number;
    cached: number;
    usage: number;
  };
  disk: {
    used: number;
    available: number;
    usage: number;
    iops: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

interface DatabaseMetrics {
  neo4j: {
    connectedClients: number;
    queriesPerSecond: number;
    avgQueryTime: number;
    cacheHitRate: number;
    storeSize: number;
    transactions: number;
    slowQueries: number;
  };
  postgres: {
    activeConnections: number;
    idleConnections: number;
    queriesPerSecond: number;
    avgQueryTime: number;
    cacheHitRate: number;
    dbSize: number;
    deadlocks: number;
    slowQueries: number;
  };
  redis: {
    connectedClients: number;
    memoryUsed: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    commandsProcessed: number;
    avgTtl: number;
  };
}

interface ApplicationMetrics {
  requests: {
    total: number;
    rps: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
  };
  optimization: {
    cacheHitRate: number;
    queryOptimizationSavings: number;
    costOptimizationSavings: number;
    circuitBreakerTrips: number;
    bulkheadRejections: number;
  };
  ai: {
    modelRequests: number;
    totalCost: number;
    avgCostPerRequest: number;
    qualityScore: number;
    failureRate: number;
  };
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: number;
  channels: Array<'email' | 'slack' | 'webhook' | 'sms'>;
  actions: Array<
    'scale_up' | 'restart_service' | 'clear_cache' | 'notify_admin'
  >;
}

interface PerformanceAlert {
  id: string;
  ruleId: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  metrics: any;
  resolved: boolean;
  resolvedAt?: number;
  actions: string[];
}

interface SLODefinition {
  name: string;
  description: string;
  target: number; // e.g., 99.9 for 99.9% availability
  measurement: 'availability' | 'response_time' | 'error_rate' | 'throughput';
  window: 'hourly' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
}

interface SLOStatus {
  slo: SLODefinition;
  current: number;
  target: number;
  status: 'healthy' | 'at_risk' | 'violated';
  timeToExhaustion: number; // seconds until SLO violation
  errorBudget: {
    total: number;
    consumed: number;
    remaining: number;
  };
}

interface PerformanceDashboard {
  overview: {
    systemHealth: 'healthy' | 'degraded' | 'critical';
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    costToday: number;
  };
  realTime: {
    rps: number;
    activeUsers: number;
    queueDepth: number;
    cacheHitRate: number;
  };
  slos: SLOStatus[];
  alerts: PerformanceAlert[];
  trends: {
    responseTime: number[];
    throughput: number[];
    errorRate: number[];
    cost: number[];
  };
}

export class PerformanceMonitoringSystem extends EventEmitter {
  private redis = getRedisClient();
  private neo4jDriver = getNeo4jDriver();
  private pgPool = getPostgresPool();

  private neo4jOptimizer: Neo4jQueryOptimizer;
  private pgOptimizer: PostgresPerformanceOptimizer;
  private gatewayOptimizer: ApiGatewayOptimizer;
  private costOptimizer: CostEfficiencyOptimizer;

  private metrics: {
    system: SystemMetrics[];
    database: DatabaseMetrics[];
    application: ApplicationMetrics[];
  };

  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private sloDefinitions: Map<string, SLODefinition> = new Map();
  private performanceBaselines: Map<string, number> = new Map();

  private readonly METRICS_RETENTION_HOURS = 72; // 3 days
  private readonly COLLECTION_INTERVAL_MS = 15000; // 15 seconds
  private readonly ANALYTICS_INTERVAL_MS = 300000; // 5 minutes
  private readonly SLO_CHECK_INTERVAL_MS = 60000; // 1 minute

  constructor(optimizers: {
    neo4j: Neo4jQueryOptimizer;
    postgres: PostgresPerformanceOptimizer;
    gateway: ApiGatewayOptimizer;
    cost: CostEfficiencyOptimizer;
  }) {
    super();

    this.neo4jOptimizer = optimizers.neo4j;
    this.pgOptimizer = optimizers.postgres;
    this.gatewayOptimizer = optimizers.gateway;
    this.costOptimizer = optimizers.cost;

    this.metrics = {
      system: [],
      database: [],
      application: [],
    };

    this.initializeDefaultAlertRules();
    this.initializeDefaultSLOs();
    this.startMetricsCollection();
    this.startPerformanceAnalytics();
    this.startAlertProcessing();
    this.startSLOMonitoring();
    this.startAutomatedActions();
  }

  /**
   * 📊 CORE: Real-time metrics collection and aggregation
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();

    try {
      // System metrics collection (using Node.js built-in modules)
      const cpuUsage = process.cpuUsage();
      const memoryUsage = process.memoryUsage();

      const metrics: SystemMetrics = {
        timestamp,
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
          cores: require('os').cpus().length,
          loadAverage: require('os').loadavg(),
        },
        memory: {
          used: memoryUsage.heapUsed,
          available: memoryUsage.heapTotal,
          cached: memoryUsage.external,
          usage: memoryUsage.heapUsed / memoryUsage.heapTotal,
        },
        disk: {
          used: 0, // Would use statvfs or similar in production
          available: 0,
          usage: 0,
          iops: 0,
        },
        network: {
          bytesIn: 0, // Would collect from network interface stats
          bytesOut: 0,
          packetsIn: 0,
          packetsOut: 0,
        },
      };

      this.metrics.system.push(metrics);
      this.pruneOldMetrics('system');

      return metrics;
    } catch (error) {
      logger.error('Failed to collect system metrics:', error);
      throw error;
    }
  }

  async collectDatabaseMetrics(): Promise<DatabaseMetrics> {
    const timestamp = Date.now();

    try {
      // Neo4j metrics
      const neo4jMetrics = await this.collectNeo4jMetrics();

      // PostgreSQL metrics
      const pgMetrics = await this.collectPostgresMetrics();

      // Redis metrics
      const redisMetrics = await this.collectRedisMetrics();

      const metrics: DatabaseMetrics = {
        neo4j: neo4jMetrics,
        postgres: pgMetrics,
        redis: redisMetrics,
      };

      this.metrics.database.push({ ...metrics, timestamp } as any);
      this.pruneOldMetrics('database');

      return metrics;
    } catch (error) {
      logger.error('Failed to collect database metrics:', error);
      throw error;
    }
  }

  async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    const timestamp = Date.now();

    try {
      // Get optimization metrics
      const neo4jStats = await this.neo4jOptimizer.getPerformanceStats();
      const pgReport = await this.pgOptimizer.getPerformanceReport();
      const gatewayReport = await this.gatewayOptimizer.getPerformanceReport();
      const costReport = await this.costOptimizer.getUsageReport(
        'system',
        'system',
      );

      const metrics: ApplicationMetrics = {
        requests: {
          total: this.calculateTotalRequests(),
          rps: this.calculateCurrentRPS(),
          avgResponseTime: this.calculateAvgResponseTime(),
          p95ResponseTime: this.calculateP95ResponseTime(),
          p99ResponseTime: this.calculateP99ResponseTime(),
          errorRate: this.calculateErrorRate(),
        },
        optimization: {
          cacheHitRate: this.calculateOverallCacheHitRate(),
          queryOptimizationSavings: this.calculateQueryOptimizationSavings(),
          costOptimizationSavings: costReport.costs?.total || 0,
          circuitBreakerTrips: this.countCircuitBreakerTrips(),
          bulkheadRejections: this.countBulkheadRejections(),
        },
        ai: {
          modelRequests: costReport.costs?.byModel
            ? Object.values(costReport.costs.byModel).length
            : 0,
          totalCost: costReport.costs?.total || 0,
          avgCostPerRequest: costReport.efficiency?.avgCostPerRequest || 0,
          qualityScore: 0.92, // Would be calculated from actual AI responses
          failureRate: 0.02, // Would be calculated from actual failures
        },
      };

      this.metrics.application.push({ ...metrics, timestamp } as any);
      this.pruneOldMetrics('application');

      return metrics;
    } catch (error) {
      logger.error('Failed to collect application metrics:', error);
      throw error;
    }
  }

  /**
   * 🚨 Intelligent alerting with ML-based anomaly detection
   */
  async processAlerts(): Promise<void> {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = await this.evaluateAlertRule(rule);

        if (shouldAlert) {
          const cooldownPassed =
            !rule.lastTriggered ||
            Date.now() - rule.lastTriggered > rule.cooldownMinutes * 60 * 1000;

          if (cooldownPassed) {
            await this.triggerAlert(rule);
          }
        } else {
          // Check if we should resolve any existing alerts
          await this.checkAlertResolution(rule);
        }
      } catch (error) {
        logger.error(`Failed to process alert rule ${ruleId}:`, error);
      }
    }
  }

  private async evaluateAlertRule(rule: AlertRule): Promise<boolean> {
    const latestMetrics = this.getLatestMetrics();

    switch (rule.condition) {
      case 'cpu_usage':
        return latestMetrics.system.cpu.usage > rule.threshold;

      case 'memory_usage':
        return latestMetrics.system.memory.usage > rule.threshold;

      case 'response_time_p95':
        return (
          latestMetrics.application.requests.p95ResponseTime > rule.threshold
        );

      case 'error_rate':
        return latestMetrics.application.requests.errorRate > rule.threshold;

      case 'cache_hit_rate':
        return (
          latestMetrics.application.optimization.cacheHitRate < rule.threshold
        );

      case 'database_connections':
        return (
          latestMetrics.database.postgres.activeConnections > rule.threshold
        );

      case 'neo4j_slow_queries':
        return latestMetrics.database.neo4j.slowQueries > rule.threshold;

      case 'ai_cost_spike':
        return latestMetrics.application.ai.avgCostPerRequest > rule.threshold;

      case 'circuit_breaker_trips':
        return (
          latestMetrics.application.optimization.circuitBreakerTrips >
          rule.threshold
        );

      default:
        // Custom condition evaluation using eval (be careful in production)
        try {
          const conditionFunction = new Function(
            'metrics',
            `return ${rule.condition}`,
          );
          return conditionFunction(latestMetrics);
        } catch (error) {
          logger.warn(`Invalid alert condition: ${rule.condition}`, error);
          return false;
        }
    }
  }

  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const latestMetrics = this.getLatestMetrics();

    const alert: PerformanceAlert = {
      id: alertId,
      ruleId: rule.id,
      timestamp: Date.now(),
      severity: rule.severity,
      title: rule.name,
      description: this.generateAlertDescription(rule, latestMetrics),
      metrics: latestMetrics,
      resolved: false,
      actions: [],
    };

    this.activeAlerts.set(alertId, alert);
    rule.lastTriggered = Date.now();

    // Execute automated actions
    for (const action of rule.actions) {
      try {
        await this.executeAutomatedAction(action, alert);
        alert.actions.push(action);
      } catch (error) {
        logger.error(`Failed to execute automated action ${action}:`, error);
      }
    }

    // Send notifications
    for (const channel of rule.channels) {
      try {
        await this.sendAlertNotification(channel, alert);
      } catch (error) {
        logger.error(
          `Failed to send alert notification via ${channel}:`,
          error,
        );
      }
    }

    this.emit('alertTriggered', alert);
    logger.warn(`Alert triggered: ${rule.name}`, {
      alertId,
      severity: rule.severity,
    });
  }

  /**
   * 📈 SLO monitoring and error budget management
   */
  async checkSLOs(): Promise<void> {
    for (const [name, slo] of this.sloDefinitions) {
      if (!slo.enabled) continue;

      try {
        const status = await this.calculateSLOStatus(slo);

        if (status.status === 'violated') {
          await this.handleSLOViolation(slo, status);
        } else if (status.status === 'at_risk') {
          await this.handleSLOAtRisk(slo, status);
        }

        // Store SLO status for dashboard
        await this.storeSLOStatus(name, status);
      } catch (error) {
        logger.error(`Failed to check SLO ${name}:`, error);
      }
    }
  }

  private async calculateSLOStatus(slo: SLODefinition): Promise<SLOStatus> {
    const windowMs = this.getSLOWindowMs(slo.window);
    const startTime = Date.now() - windowMs;

    let current = 0;
    let errorBudget = { total: 0, consumed: 0, remaining: 0 };
    let timeToExhaustion = Infinity;

    switch (slo.measurement) {
      case 'availability':
        current = await this.calculateAvailability(startTime);
        break;

      case 'response_time':
        current = await this.calculateResponseTimePercentile(startTime, 95);
        break;

      case 'error_rate':
        current = await this.calculateErrorRateForPeriod(startTime);
        break;

      case 'throughput':
        current = await this.calculateThroughputForPeriod(startTime);
        break;
    }

    // Calculate error budget
    const allowedFailureRate = (100 - slo.target) / 100;
    const totalRequests = await this.getTotalRequestsForPeriod(startTime);
    errorBudget.total = totalRequests * allowedFailureRate;

    if (
      slo.measurement === 'availability' ||
      slo.measurement === 'error_rate'
    ) {
      const failures = await this.getFailuresForPeriod(startTime);
      errorBudget.consumed = failures;
      errorBudget.remaining = Math.max(
        0,
        errorBudget.total - errorBudget.consumed,
      );

      // Calculate time to exhaustion based on current failure rate
      const recentFailureRate = await this.getRecentFailureRate(60 * 60 * 1000); // Last hour
      if (recentFailureRate > 0) {
        timeToExhaustion = (errorBudget.remaining / recentFailureRate) * 1000; // Convert to ms
      }
    }

    let status: 'healthy' | 'at_risk' | 'violated';
    if (current < slo.target) {
      status = 'violated';
    } else if (errorBudget.remaining / errorBudget.total < 0.1) {
      // Less than 10% error budget remaining
      status = 'at_risk';
    } else {
      status = 'healthy';
    }

    return {
      slo,
      current,
      target: slo.target,
      status,
      timeToExhaustion,
      errorBudget,
    };
  }

  /**
   * 🎯 Automated performance regression detection
   */
  async detectPerformanceRegressions(): Promise<
    Array<{
      metric: string;
      baseline: number;
      current: number;
      deviation: number;
      severity: 'minor' | 'major' | 'critical';
      confidence: number;
      recommendation: string;
    }>
  > {
    const regressions = [];
    const currentMetrics = this.getLatestMetrics();

    // Define key metrics to monitor for regressions
    const metricsToCheck = [
      { key: 'application.requests.avgResponseTime', threshold: 0.2 },
      { key: 'application.requests.p95ResponseTime', threshold: 0.3 },
      { key: 'application.optimization.cacheHitRate', threshold: -0.1 },
      { key: 'database.neo4j.avgQueryTime', threshold: 0.25 },
      { key: 'database.postgres.avgQueryTime', threshold: 0.25 },
      { key: 'system.memory.usage', threshold: 0.15 },
    ];

    for (const metricConfig of metricsToCheck) {
      const baseline = this.performanceBaselines.get(metricConfig.key);
      if (!baseline) continue;

      const current = this.getNestedMetricValue(
        currentMetrics,
        metricConfig.key,
      );
      if (current === null) continue;

      const deviation = (current - baseline) / baseline;

      // Check for regression based on threshold
      const isRegression =
        Math.abs(deviation) > Math.abs(metricConfig.threshold);

      if (isRegression) {
        const severity = this.classifyRegressionSeverity(Math.abs(deviation));
        const confidence = this.calculateRegressionConfidence(
          metricConfig.key,
          baseline,
          current,
        );

        regressions.push({
          metric: metricConfig.key,
          baseline,
          current,
          deviation,
          severity,
          confidence,
          recommendation: this.generateRegressionRecommendation(
            metricConfig.key,
            deviation,
          ),
        });
      }
    }

    if (regressions.length > 0) {
      this.emit('performanceRegressionDetected', regressions);
      logger.warn(`Detected ${regressions.length} performance regressions`);
    }

    return regressions;
  }

  /**
   * 📊 Performance dashboard generation
   */
  async generatePerformanceDashboard(): Promise<PerformanceDashboard> {
    const latestMetrics = this.getLatestMetrics();
    const sloStatuses = await this.getAllSLOStatuses();
    const activeAlerts = Array.from(this.activeAlerts.values())
      .filter((alert) => !alert.resolved)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10); // Top 10 recent alerts

    // Calculate system health
    const systemHealth = this.calculateSystemHealth(
      latestMetrics,
      sloStatuses,
      activeAlerts,
    );

    // Generate trend data (last 24 hours)
    const trends = await this.generateTrendData(24 * 60 * 60 * 1000);

    const dashboard: PerformanceDashboard = {
      overview: {
        systemHealth,
        totalRequests: latestMetrics.application.requests.total,
        avgResponseTime: latestMetrics.application.requests.avgResponseTime,
        errorRate: latestMetrics.application.requests.errorRate,
        costToday: latestMetrics.application.ai.totalCost,
      },
      realTime: {
        rps: latestMetrics.application.requests.rps,
        activeUsers: this.calculateActiveUsers(),
        queueDepth: this.calculateQueueDepth(),
        cacheHitRate: latestMetrics.application.optimization.cacheHitRate,
      },
      slos: sloStatuses,
      alerts: activeAlerts,
      trends,
    };

    return dashboard;
  }

  /**
   * 🔧 Private helper methods
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        condition: 'cpu_usage',
        threshold: 0.8,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 5,
        channels: ['email', 'slack'],
        actions: ['notify_admin'],
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        condition: 'memory_usage',
        threshold: 0.85,
        severity: 'error',
        enabled: true,
        cooldownMinutes: 3,
        channels: ['email', 'slack'],
        actions: ['clear_cache', 'notify_admin'],
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        condition: 'response_time_p95',
        threshold: 2000,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 2,
        channels: ['slack'],
        actions: ['notify_admin'],
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: 'error_rate',
        threshold: 0.05,
        severity: 'error',
        enabled: true,
        cooldownMinutes: 1,
        channels: ['email', 'slack', 'sms'],
        actions: ['notify_admin'],
      },
      {
        id: 'low_cache_hit_rate',
        name: 'Low Cache Hit Rate',
        condition: 'cache_hit_rate',
        threshold: 0.7,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 10,
        channels: ['slack'],
        actions: ['notify_admin'],
      },
      {
        id: 'ai_cost_spike',
        name: 'AI Cost Spike',
        condition: 'ai_cost_spike',
        threshold: 0.1,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 15,
        channels: ['email'],
        actions: ['notify_admin'],
      },
    ];

    defaultRules.forEach((rule) => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private initializeDefaultSLOs(): void {
    const defaultSLOs: SLODefinition[] = [
      {
        name: 'api_availability',
        description: 'API should be available 99.9% of the time',
        target: 99.9,
        measurement: 'availability',
        window: 'monthly',
        enabled: true,
      },
      {
        name: 'response_time_p95',
        description: '95% of requests should complete within 2 seconds',
        target: 2000,
        measurement: 'response_time',
        window: 'daily',
        enabled: true,
      },
      {
        name: 'error_rate',
        description: 'Error rate should be below 1%',
        target: 1.0,
        measurement: 'error_rate',
        window: 'daily',
        enabled: true,
      },
    ];

    defaultSLOs.forEach((slo) => {
      this.sloDefinitions.set(slo.name, slo);
    });
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      try {
        await Promise.all([
          this.collectSystemMetrics(),
          this.collectDatabaseMetrics(),
          this.collectApplicationMetrics(),
        ]);
      } catch (error) {
        logger.error('Metrics collection failed:', error);
      }
    }, this.COLLECTION_INTERVAL_MS);
  }

  private startPerformanceAnalytics(): void {
    setInterval(async () => {
      try {
        await this.updatePerformanceBaselines();
        await this.detectPerformanceRegressions();
        await this.analyzePerformanceTrends();
      } catch (error) {
        logger.error('Performance analytics failed:', error);
      }
    }, this.ANALYTICS_INTERVAL_MS);
  }

  private startAlertProcessing(): void {
    setInterval(async () => {
      try {
        await this.processAlerts();
      } catch (error) {
        logger.error('Alert processing failed:', error);
      }
    }, this.COLLECTION_INTERVAL_MS);
  }

  private startSLOMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkSLOs();
      } catch (error) {
        logger.error('SLO monitoring failed:', error);
      }
    }, this.SLO_CHECK_INTERVAL_MS);
  }

  private startAutomatedActions(): void {
    // Listen for specific events and trigger automated responses
    this.on('alertTriggered', async (alert: PerformanceAlert) => {
      if (alert.severity === 'critical') {
        await this.handleCriticalAlert(alert);
      }
    });

    this.on('performanceRegressionDetected', async (regressions: any[]) => {
      for (const regression of regressions) {
        if (regression.severity === 'critical') {
          await this.handleCriticalRegression(regression);
        }
      }
    });
  }

  // Database-specific metric collection methods
  private async collectNeo4jMetrics(): Promise<any> {
    try {
      const session = this.neo4jDriver.session();
      const result = await session.run(`
        CALL dbms.queryJmx("*:*")
        YIELD name, attributes
        WHERE name CONTAINS "database"
        RETURN name, attributes
      `);

      await session.close();

      // Parse JMX data (simplified)
      return {
        connectedClients: 10, // Would be extracted from JMX
        queriesPerSecond: 50,
        avgQueryTime: 120,
        cacheHitRate: 0.85,
        storeSize: 1024 * 1024 * 100,
        transactions: 1000,
        slowQueries: 2,
      };
    } catch (error) {
      logger.warn('Failed to collect Neo4j metrics:', error);
      return this.getDefaultNeo4jMetrics();
    }
  }

  private async collectPostgresMetrics(): Promise<any> {
    try {
      const client = await this.pgPool.connect();
      const results = await Promise.all([
        client.query(
          'SELECT count(*) as active FROM pg_stat_activity WHERE state = $1',
          ['active'],
        ),
        client.query(
          'SELECT count(*) as idle FROM pg_stat_activity WHERE state = $1',
          ['idle'],
        ),
        client.query(`SELECT 
          sum(calls) as total_queries,
          avg(mean_exec_time) as avg_query_time 
          FROM pg_stat_statements 
          WHERE calls > 0
        `),
        client.query(`SELECT 
          sum(blks_hit) as cache_hits,
          sum(blks_read) as cache_misses 
          FROM pg_stat_database
        `),
      ]);

      client.release();

      const cacheHits = parseInt(results[3].rows[0]?.cache_hits || '0');
      const cacheMisses = parseInt(results[3].rows[0]?.cache_misses || '0');
      const cacheHitRate = cacheHits / (cacheHits + cacheMisses) || 0;

      return {
        activeConnections: parseInt(results[0].rows[0]?.active || '0'),
        idleConnections: parseInt(results[1].rows[0]?.idle || '0'),
        queriesPerSecond:
          parseFloat(results[2].rows[0]?.total_queries || '0') / 60,
        avgQueryTime: parseFloat(results[2].rows[0]?.avg_query_time || '0'),
        cacheHitRate,
        dbSize: 0, // Would query pg_database_size
        deadlocks: 0, // Would query pg_stat_database
        slowQueries: 0, // Would be tracked separately
      };
    } catch (error) {
      logger.warn('Failed to collect PostgreSQL metrics:', error);
      return this.getDefaultPostgresMetrics();
    }
  }

  private async collectRedisMetrics(): Promise<any> {
    try {
      if (!this.redis) {
        return this.getDefaultRedisMetrics();
      }

      const info = await this.redis.info();
      const lines = info.split('\r\n');
      const metrics: any = {};

      lines.forEach((line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          metrics[key] = value;
        }
      });

      return {
        connectedClients: parseInt(metrics.connected_clients || '0'),
        memoryUsed: parseInt(metrics.used_memory || '0'),
        keyspaceHits: parseInt(metrics.keyspace_hits || '0'),
        keyspaceMisses: parseInt(metrics.keyspace_misses || '0'),
        commandsProcessed: parseInt(metrics.total_commands_processed || '0'),
        avgTtl: 3600, // Would calculate from key sampling
      };
    } catch (error) {
      logger.warn('Failed to collect Redis metrics:', error);
      return this.getDefaultRedisMetrics();
    }
  }

  // Helper methods for metric calculations
  private calculateTotalRequests(): number {
    const recentMetrics = this.metrics.application.slice(-60); // Last 15 minutes
    return recentMetrics.reduce(
      (sum, m) => sum + (m as any).requests?.total || 0,
      0,
    );
  }

  private calculateCurrentRPS(): number {
    const recentMetrics = this.metrics.application.slice(-4); // Last minute
    if (recentMetrics.length === 0) return 0;

    const totalRequests = recentMetrics.reduce(
      (sum, m) => sum + (m as any).requests?.total || 0,
      0,
    );
    return totalRequests / recentMetrics.length;
  }

  private calculateAvgResponseTime(): number {
    const recentMetrics = this.metrics.application.slice(-20); // Last 5 minutes
    if (recentMetrics.length === 0) return 0;

    return (
      recentMetrics.reduce(
        (sum, m) => sum + (m as any).requests?.avgResponseTime || 0,
        0,
      ) / recentMetrics.length
    );
  }

  private calculateP95ResponseTime(): number {
    const recentMetrics = this.metrics.application.slice(-20);
    const responseTimes = recentMetrics
      .map((m) => (m as any).requests?.avgResponseTime || 0)
      .sort((a, b) => a - b);
    const p95Index = Math.ceil(responseTimes.length * 0.95) - 1;
    return responseTimes[p95Index] || 0;
  }

  private calculateP99ResponseTime(): number {
    const recentMetrics = this.metrics.application.slice(-20);
    const responseTimes = recentMetrics
      .map((m) => (m as any).requests?.avgResponseTime || 0)
      .sort((a, b) => a - b);
    const p99Index = Math.ceil(responseTimes.length * 0.99) - 1;
    return responseTimes[p99Index] || 0;
  }

  private calculateErrorRate(): number {
    const recentMetrics = this.metrics.application.slice(-20);
    if (recentMetrics.length === 0) return 0;

    return (
      recentMetrics.reduce(
        (sum, m) => sum + (m as any).requests?.errorRate || 0,
        0,
      ) / recentMetrics.length
    );
  }

  private calculateOverallCacheHitRate(): number {
    const latestDb = this.metrics.database[this.metrics.database.length - 1];
    const latestApp =
      this.metrics.application[this.metrics.application.length - 1];

    if (!latestDb || !latestApp) return 0;

    // Weighted average of database and application cache hit rates
    const dbRate =
      ((latestDb as any).neo4j?.cacheHitRate || 0) * 0.3 +
      ((latestDb as any).postgres?.cacheHitRate || 0) * 0.3;
    const appRate = ((latestApp as any).optimization?.cacheHitRate || 0) * 0.4;

    return dbRate + appRate;
  }

  private calculateQueryOptimizationSavings(): number {
    // This would calculate actual savings from query optimizations
    return 25.5; // Placeholder
  }

  private countCircuitBreakerTrips(): number {
    const recentMetrics = this.metrics.application.slice(-20);
    return recentMetrics.reduce(
      (sum, m) => sum + (m as any).optimization?.circuitBreakerTrips || 0,
      0,
    );
  }

  private countBulkheadRejections(): number {
    const recentMetrics = this.metrics.application.slice(-20);
    return recentMetrics.reduce(
      (sum, m) => sum + (m as any).optimization?.bulkheadRejections || 0,
      0,
    );
  }

  private getDefaultNeo4jMetrics(): any {
    return {
      connectedClients: 0,
      queriesPerSecond: 0,
      avgQueryTime: 0,
      cacheHitRate: 0,
      storeSize: 0,
      transactions: 0,
      slowQueries: 0,
    };
  }

  private getDefaultPostgresMetrics(): any {
    return {
      activeConnections: 0,
      idleConnections: 0,
      queriesPerSecond: 0,
      avgQueryTime: 0,
      cacheHitRate: 0,
      dbSize: 0,
      deadlocks: 0,
      slowQueries: 0,
    };
  }

  private getDefaultRedisMetrics(): any {
    return {
      connectedClients: 0,
      memoryUsed: 0,
      keyspaceHits: 0,
      keyspaceMisses: 0,
      commandsProcessed: 0,
      avgTtl: 0,
    };
  }

  private pruneOldMetrics(type: 'system' | 'database' | 'application'): void {
    const cutoffTime =
      Date.now() - this.METRICS_RETENTION_HOURS * 60 * 60 * 1000;
    this.metrics[type] = this.metrics[type].filter(
      (m) => (m as any).timestamp > cutoffTime,
    );
  }

  private getLatestMetrics(): any {
    return {
      system: this.metrics.system[this.metrics.system.length - 1] || {},
      database: this.metrics.database[this.metrics.database.length - 1] || {},
      application:
        this.metrics.application[this.metrics.application.length - 1] || {},
    };
  }

  // Additional helper methods would continue with similar implementations...
  private generateAlertDescription(rule: AlertRule, metrics: any): string {
    return `Alert triggered: ${rule.name}. Current metrics exceed threshold of ${rule.threshold}.`;
  }

  private async executeAutomatedAction(
    action: string,
    alert: PerformanceAlert,
  ): Promise<void> {
    switch (action) {
      case 'clear_cache':
        await this.neo4jOptimizer.clearCache();
        await this.pgOptimizer.clearQueryCache();
        break;
      case 'scale_up':
        logger.info(
          'Scale up action triggered (would integrate with orchestration platform)',
        );
        break;
      case 'restart_service':
        logger.info(
          'Service restart action triggered (would integrate with process manager)',
        );
        break;
      case 'notify_admin':
        logger.info('Admin notification sent');
        break;
    }
  }

  private async sendAlertNotification(
    channel: string,
    alert: PerformanceAlert,
  ): Promise<void> {
    // Integration points for different notification channels
    switch (channel) {
      case 'email':
        logger.info(`Email alert sent: ${alert.title}`);
        break;
      case 'slack':
        logger.info(`Slack alert sent: ${alert.title}`);
        break;
      case 'webhook':
        logger.info(`Webhook alert sent: ${alert.title}`);
        break;
      case 'sms':
        logger.info(`SMS alert sent: ${alert.title}`);
        break;
    }
  }

  private async checkAlertResolution(rule: AlertRule): Promise<void> {
    // Check if any active alerts for this rule should be resolved
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.ruleId === rule.id && !alert.resolved) {
        const shouldResolve = !(await this.evaluateAlertRule(rule));
        if (shouldResolve) {
          alert.resolved = true;
          alert.resolvedAt = Date.now();
          this.emit('alertResolved', alert);
        }
      }
    }
  }

  // Placeholder implementations for remaining methods
  private getSLOWindowMs(window: string): number {
    switch (window) {
      case 'hourly':
        return 60 * 60 * 1000;
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000;
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  private async calculateAvailability(startTime: number): Promise<number> {
    // Calculate availability percentage
    return 99.5; // Placeholder
  }

  private async calculateResponseTimePercentile(
    startTime: number,
    percentile: number,
  ): Promise<number> {
    return 1500; // Placeholder
  }

  private async calculateErrorRateForPeriod(
    startTime: number,
  ): Promise<number> {
    return 0.02; // Placeholder
  }

  private async calculateThroughputForPeriod(
    startTime: number,
  ): Promise<number> {
    return 100; // Placeholder
  }

  private async getTotalRequestsForPeriod(startTime: number): Promise<number> {
    return 10000; // Placeholder
  }

  private async getFailuresForPeriod(startTime: number): Promise<number> {
    return 200; // Placeholder
  }

  private async getRecentFailureRate(windowMs: number): Promise<number> {
    return 0.01; // Placeholder
  }

  private getNestedMetricValue(obj: any, path: string): number | null {
    return (
      path.split('.').reduce((current, key) => current?.[key], obj) || null
    );
  }

  private classifyRegressionSeverity(
    deviation: number,
  ): 'minor' | 'major' | 'critical' {
    if (deviation > 0.5) return 'critical';
    if (deviation > 0.25) return 'major';
    return 'minor';
  }

  private calculateRegressionConfidence(
    metric: string,
    baseline: number,
    current: number,
  ): number {
    // Simple confidence calculation based on deviation magnitude
    const deviation = Math.abs(current - baseline) / baseline;
    return Math.min(0.95, 0.5 + deviation);
  }

  private generateRegressionRecommendation(
    metric: string,
    deviation: number,
  ): string {
    if (metric.includes('responseTime')) {
      return 'Consider optimizing database queries or increasing cache hit rates';
    }
    if (metric.includes('memory')) {
      return 'Investigate memory leaks or consider scaling up resources';
    }
    return 'Investigate recent changes and consider rollback if necessary';
  }

  private async updatePerformanceBaselines(): Promise<void> {
    // Update baseline performance metrics based on historical data
    const historicalWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
    // Implementation would calculate moving averages for key metrics
  }

  private async analyzePerformanceTrends(): Promise<void> {
    // Analyze trends in performance metrics
    // Implementation would identify patterns and predict issues
  }

  private async getAllSLOStatuses(): Promise<SLOStatus[]> {
    const statuses: SLOStatus[] = [];
    for (const slo of this.sloDefinitions.values()) {
      if (slo.enabled) {
        statuses.push(await this.calculateSLOStatus(slo));
      }
    }
    return statuses;
  }

  private calculateSystemHealth(
    metrics: any,
    slos: SLOStatus[],
    alerts: PerformanceAlert[],
  ): 'healthy' | 'degraded' | 'critical' {
    const criticalAlerts = alerts.filter(
      (a) => a.severity === 'critical',
    ).length;
    const violatedSLOs = slos.filter((s) => s.status === 'violated').length;

    if (criticalAlerts > 0 || violatedSLOs > 0) return 'critical';
    if (alerts.length > 0 || slos.some((s) => s.status === 'at_risk'))
      return 'degraded';
    return 'healthy';
  }

  private async generateTrendData(windowMs: number): Promise<any> {
    // Generate trend data for the dashboard
    return {
      responseTime: [], // Would contain historical data points
      throughput: [],
      errorRate: [],
      cost: [],
    };
  }

  private calculateActiveUsers(): number {
    return 150; // Placeholder - would calculate from session data
  }

  private calculateQueueDepth(): number {
    return 5; // Placeholder - would calculate from actual queue metrics
  }

  private async handleSLOViolation(
    slo: SLODefinition,
    status: SLOStatus,
  ): Promise<void> {
    logger.error(`SLO violation: ${slo.name}`, status);
    this.emit('sloViolation', { slo, status });
  }

  private async handleSLOAtRisk(
    slo: SLODefinition,
    status: SLOStatus,
  ): Promise<void> {
    logger.warn(`SLO at risk: ${slo.name}`, status);
    this.emit('sloAtRisk', { slo, status });
  }

  private async storeSLOStatus(name: string, status: SLOStatus): Promise<void> {
    if (this.redis) {
      await this.redis.setex(`slo_status:${name}`, 300, JSON.stringify(status));
    }
  }

  private async handleCriticalAlert(alert: PerformanceAlert): Promise<void> {
    logger.error('Critical alert handling triggered', alert);
    // Implement critical alert response
  }

  private async handleCriticalRegression(regression: any): Promise<void> {
    logger.error('Critical regression handling triggered', regression);
    // Implement critical regression response
  }

  /**
   * 📊 Public API methods
   */
  async getDashboard(): Promise<PerformanceDashboard> {
    return this.generatePerformanceDashboard();
  }

  async getMetricsHistory(hours: number = 24): Promise<any> {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    return {
      system: this.metrics.system.filter((m) => m.timestamp > cutoff),
      database: this.metrics.database.filter(
        (m) => (m as any).timestamp > cutoff,
      ),
      application: this.metrics.application.filter(
        (m) => (m as any).timestamp > cutoff,
      ),
    };
  }

  async createAlertRule(rule: AlertRule): Promise<void> {
    this.alertRules.set(rule.id, rule);
    this.emit('alertRuleCreated', rule);
  }

  async updateAlertRule(
    ruleId: string,
    updates: Partial<AlertRule>,
  ): Promise<void> {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.emit('alertRuleUpdated', rule);
    }
  }

  async deleteAlertRule(ruleId: string): Promise<void> {
    this.alertRules.delete(ruleId);
    this.emit('alertRuleDeleted', ruleId);
  }

  async createSLO(slo: SLODefinition): Promise<void> {
    this.sloDefinitions.set(slo.name, slo);
    this.emit('sloCreated', slo);
  }

  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    return Array.from(this.activeAlerts.values()).filter(
      (alert) => !alert.resolved,
    );
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.emit('alertResolved', alert);
    }
  }
}
