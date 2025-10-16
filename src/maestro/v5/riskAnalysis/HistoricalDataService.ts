import { Logger } from '../../utils/logger';
import { DatabaseService } from '../../database/DatabaseService';
import { TimeSeriesAnalyzer } from './TimeSeriesAnalyzer';

export interface HistoricalDeployment {
  id: string;
  serviceId: string;
  version: string;
  environment: string;
  timestamp: Date;
  success: boolean;
  rollbackTime?: number;
  errorRate: number;
  latency: number;
  throughput: number;
  complexity: number;
  linesChanged: number;
  testCoverage: number;
  changeType: string;
  dependencies: string[];
  metrics: Record<string, number>;
}

export interface TrendData {
  metric: string;
  serviceId: string;
  values: { timestamp: Date; value: number }[];
  trend: number; // -1 to 1, negative = declining, positive = improving
  confidence: number;
}

export interface DependencyHealth {
  serviceId: string;
  availability: number;
  errorRate: number;
  latency: number;
  lastUpdated: Date;
}

/**
 * Historical Data Service for risk analysis and trend detection
 */
export class HistoricalDataService {
  private logger: Logger;
  private database: DatabaseService;
  private timeSeriesAnalyzer: TimeSeriesAnalyzer;
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  constructor(logger: Logger, database: DatabaseService) {
    this.logger = logger;
    this.database = database;
    this.timeSeriesAnalyzer = new TimeSeriesAnalyzer();
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Historical Data Service...');

    // Create necessary database tables/collections
    await this.setupDatabase();

    // Initialize time series analyzer
    await this.timeSeriesAnalyzer.initialize();

    this.logger.info('Historical Data Service initialized');
  }

  /**
   * Get historical deployments for a service
   */
  async getServiceHistory(
    serviceId: string,
    limit = 100,
  ): Promise<HistoricalDeployment[]> {
    const cacheKey = `service_history_${serviceId}_${limit}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const query = `
        SELECT * FROM deployments 
        WHERE service_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `;

      const result = await this.database.query(query, [serviceId, limit]);
      const deployments = result.rows.map((row) =>
        this.mapRowToDeployment(row),
      );

      this.setCachedData(cacheKey, deployments);
      return deployments;
    } catch (error) {
      this.logger.error('Failed to get service history:', error);
      return [];
    }
  }

  /**
   * Get trend data for a specific metric and service
   */
  async getTrend(
    metric: string,
    serviceId: string,
    days = 30,
  ): Promise<number> {
    const cacheKey = `trend_${metric}_${serviceId}_${days}`;
    const cached = this.getCachedData(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - days * 24 * 60 * 60 * 1000,
      );

      const query = `
        SELECT timestamp, ${metric} as value
        FROM deployment_metrics 
        WHERE service_id = $1 
        AND timestamp BETWEEN $2 AND $3
        ORDER BY timestamp ASC
      `;

      const result = await this.database.query(query, [
        serviceId,
        startDate,
        endDate,
      ]);

      if (result.rows.length < 5) {
        return 0; // Not enough data for trend analysis
      }

      const values = result.rows.map((row) => ({
        timestamp: new Date(row.timestamp),
        value: parseFloat(row.value) || 0,
      }));

      const trend = await this.timeSeriesAnalyzer.calculateTrend(values);
      this.setCachedData(cacheKey, trend);

      return trend;
    } catch (error) {
      this.logger.error(`Failed to get trend for ${metric}:`, error);
      return 0;
    }
  }

  /**
   * Get training data for ML model
   */
  async getTrainingData(limit = 10000): Promise<any[]> {
    const cacheKey = `training_data_${limit}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const query = `
        SELECT 
          d.*,
          dm.complexity,
          dm.lines_changed,
          dm.test_coverage,
          dm.dependency_risk,
          dm.environment_risk,
          EXTRACT(HOUR FROM d.timestamp) as time_of_day,
          EXTRACT(DOW FROM d.timestamp) as day_of_week,
          CASE WHEN d.change_type = 'hotfix' THEN 1 ELSE 0 END as is_hotfix,
          CASE WHEN d.rollback_time IS NOT NULL THEN 1 ELSE 0 END as rollback_required,
          CASE WHEN d.success = false THEN 1 ELSE 0 END as deployment_failed
        FROM deployments d
        LEFT JOIN deployment_metrics dm ON d.id = dm.deployment_id
        WHERE dm.deployment_id IS NOT NULL
        ORDER BY d.timestamp DESC
        LIMIT $1
      `;

      const result = await this.database.query(query, [limit]);
      const trainingData = result.rows.map((row) => ({
        deploymentId: row.id,
        complexity: parseFloat(row.complexity) || 0,
        linesChanged: parseInt(row.lines_changed) || 0,
        testCoverage: parseFloat(row.test_coverage) || 0,
        historicalFailureRate: parseFloat(row.historical_failure_rate) || 0,
        dependencyRisk: parseFloat(row.dependency_risk) || 0,
        environmentRisk: parseFloat(row.environment_risk) || 0,
        timeOfDay: parseInt(row.time_of_day) || 0,
        dayOfWeek: parseInt(row.day_of_week) || 0,
        isHotfix: row.is_hotfix === 1,
        rollbackRequired: row.rollback_required === 1,
        deploymentFailed: row.deployment_failed === 1,
      }));

      this.setCachedData(cacheKey, trainingData);
      return trainingData;
    } catch (error) {
      this.logger.error('Failed to get training data:', error);
      return [];
    }
  }

  /**
   * Get dependency health data
   */
  async getDependencyHealth(serviceId: string): Promise<number> {
    const cacheKey = `dependency_health_${serviceId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const query = `
        SELECT 
          AVG(availability) as avg_availability,
          AVG(1 - error_rate) as avg_reliability,
          AVG(CASE WHEN latency < 100 THEN 1 WHEN latency < 500 THEN 0.7 ELSE 0.3 END) as latency_score
        FROM service_health 
        WHERE service_id = $1 
        AND last_updated > NOW() - INTERVAL '24 hours'
      `;

      const result = await this.database.query(query, [serviceId]);

      if (!result.rows[0] || result.rows[0].avg_availability === null) {
        return 0.7; // Default moderate health if no data
      }

      const row = result.rows[0];
      const health =
        parseFloat(row.avg_availability) * 0.4 +
        parseFloat(row.avg_reliability) * 0.4 +
        parseFloat(row.latency_score) * 0.2;

      this.setCachedData(cacheKey, health);
      return Math.min(Math.max(health, 0), 1);
    } catch (error) {
      this.logger.error(
        `Failed to get dependency health for ${serviceId}:`,
        error,
      );
      return 0.7; // Default moderate health
    }
  }

  /**
   * Store deployment record
   */
  async storeDeployment(deployment: HistoricalDeployment): Promise<void> {
    try {
      const query = `
        INSERT INTO deployments (
          id, service_id, version, environment, timestamp, success,
          rollback_time, error_rate, latency, throughput, change_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          success = EXCLUDED.success,
          rollback_time = EXCLUDED.rollback_time,
          error_rate = EXCLUDED.error_rate,
          latency = EXCLUDED.latency,
          throughput = EXCLUDED.throughput
      `;

      await this.database.query(query, [
        deployment.id,
        deployment.serviceId,
        deployment.version,
        deployment.environment,
        deployment.timestamp,
        deployment.success,
        deployment.rollbackTime,
        deployment.errorRate,
        deployment.latency,
        deployment.throughput,
        deployment.changeType,
      ]);

      // Store metrics separately
      await this.storeDeploymentMetrics(deployment.id, deployment);

      // Clear related caches
      this.clearCachesForService(deployment.serviceId);
    } catch (error) {
      this.logger.error('Failed to store deployment:', error);
      throw error;
    }
  }

  /**
   * Store deployment metrics
   */
  private async storeDeploymentMetrics(
    deploymentId: string,
    deployment: HistoricalDeployment,
  ): Promise<void> {
    const query = `
      INSERT INTO deployment_metrics (
        deployment_id, complexity, lines_changed, test_coverage,
        dependency_risk, environment_risk, custom_metrics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (deployment_id) DO UPDATE SET
        complexity = EXCLUDED.complexity,
        lines_changed = EXCLUDED.lines_changed,
        test_coverage = EXCLUDED.test_coverage,
        dependency_risk = EXCLUDED.dependency_risk,
        environment_risk = EXCLUDED.environment_risk,
        custom_metrics = EXCLUDED.custom_metrics
    `;

    const dependencyRisk =
      deployment.dependencies.length > 0
        ? await this.calculateAverageDependencyRisk(deployment.dependencies)
        : 0;

    await this.database.query(query, [
      deploymentId,
      deployment.complexity,
      deployment.linesChanged,
      deployment.testCoverage,
      dependencyRisk,
      this.calculateEnvironmentRisk(deployment.environment),
      JSON.stringify(deployment.metrics),
    ]);
  }

  /**
   * Update service health data
   */
  async updateServiceHealth(
    serviceId: string,
    health: Omit<DependencyHealth, 'serviceId' | 'lastUpdated'>,
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO service_health (
          service_id, availability, error_rate, latency, last_updated
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (service_id) DO UPDATE SET
          availability = EXCLUDED.availability,
          error_rate = EXCLUDED.error_rate,
          latency = EXCLUDED.latency,
          last_updated = EXCLUDED.last_updated
      `;

      await this.database.query(query, [
        serviceId,
        health.availability,
        health.errorRate,
        health.latency,
      ]);

      // Clear related caches
      this.cache.delete(`dependency_health_${serviceId}`);
    } catch (error) {
      this.logger.error('Failed to update service health:', error);
      throw error;
    }
  }

  /**
   * Get deployment patterns and anomalies
   */
  async getDeploymentPatterns(serviceId: string): Promise<{
    frequentFailurePatterns: string[];
    successPatterns: string[];
    timePatterns: { hour: number; successRate: number }[];
    riskFactorCorrelations: { factor: string; correlation: number }[];
  }> {
    const cacheKey = `patterns_${serviceId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const deployments = await this.getServiceHistory(serviceId, 500);

      if (deployments.length < 10) {
        return {
          frequentFailurePatterns: [],
          successPatterns: [],
          timePatterns: [],
          riskFactorCorrelations: [],
        };
      }

      const patterns =
        await this.timeSeriesAnalyzer.analyzePatterns(deployments);
      this.setCachedData(cacheKey, patterns);

      return patterns;
    } catch (error) {
      this.logger.error('Failed to get deployment patterns:', error);
      return {
        frequentFailurePatterns: [],
        successPatterns: [],
        timePatterns: [],
        riskFactorCorrelations: [],
      };
    }
  }

  /**
   * Get anomaly detection results
   */
  async detectAnomalies(
    serviceId: string,
    metric: string,
  ): Promise<{
    anomalies: {
      timestamp: Date;
      value: number;
      severity: 'low' | 'medium' | 'high';
    }[];
    baseline: number;
    threshold: number;
  }> {
    try {
      const trend = await this.getTrend(metric, serviceId, 30);
      const history = await this.getServiceHistory(serviceId, 100);

      const anomalies = await this.timeSeriesAnalyzer.detectAnomalies(
        history,
        metric,
      );

      return anomalies;
    } catch (error) {
      this.logger.error('Failed to detect anomalies:', error);
      return { anomalies: [], baseline: 0, threshold: 0 };
    }
  }

  /**
   * Setup database tables and indices
   */
  private async setupDatabase(): Promise<void> {
    const queries = [
      `
        CREATE TABLE IF NOT EXISTS deployments (
          id VARCHAR(255) PRIMARY KEY,
          service_id VARCHAR(255) NOT NULL,
          version VARCHAR(255) NOT NULL,
          environment VARCHAR(100) NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          success BOOLEAN NOT NULL,
          rollback_time INTEGER,
          error_rate DECIMAL(5,4),
          latency INTEGER,
          throughput INTEGER,
          change_type VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `,
      `
        CREATE INDEX IF NOT EXISTS idx_deployments_service_timestamp 
        ON deployments(service_id, timestamp DESC)
      `,
      `
        CREATE TABLE IF NOT EXISTS deployment_metrics (
          deployment_id VARCHAR(255) PRIMARY KEY REFERENCES deployments(id),
          complexity DECIMAL(8,4),
          lines_changed INTEGER,
          test_coverage DECIMAL(5,2),
          dependency_risk DECIMAL(5,4),
          environment_risk DECIMAL(5,4),
          custom_metrics JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS service_health (
          service_id VARCHAR(255) PRIMARY KEY,
          availability DECIMAL(5,4),
          error_rate DECIMAL(5,4),
          latency INTEGER,
          last_updated TIMESTAMP
        )
      `,
      `
        CREATE INDEX IF NOT EXISTS idx_service_health_updated 
        ON service_health(last_updated DESC)
      `,
    ];

    for (const query of queries) {
      try {
        await this.database.query(query);
      } catch (error) {
        this.logger.error('Failed to setup database table:', error);
      }
    }
  }

  /**
   * Map database row to deployment object
   */
  private mapRowToDeployment(row: any): HistoricalDeployment {
    return {
      id: row.id,
      serviceId: row.service_id,
      version: row.version,
      environment: row.environment,
      timestamp: new Date(row.timestamp),
      success: row.success,
      rollbackTime: row.rollback_time,
      errorRate: parseFloat(row.error_rate) || 0,
      latency: parseInt(row.latency) || 0,
      throughput: parseInt(row.throughput) || 0,
      complexity: parseFloat(row.complexity) || 0,
      linesChanged: parseInt(row.lines_changed) || 0,
      testCoverage: parseFloat(row.test_coverage) || 0,
      changeType: row.change_type || 'unknown',
      dependencies: [], // Would need to be populated from a separate query
      metrics: row.custom_metrics ? JSON.parse(row.custom_metrics) : {},
    };
  }

  /**
   * Calculate average dependency risk
   */
  private async calculateAverageDependencyRisk(
    dependencies: string[],
  ): Promise<number> {
    if (dependencies.length === 0) return 0;

    let totalRisk = 0;
    for (const dep of dependencies) {
      const health = await this.getDependencyHealth(dep);
      totalRisk += 1 - health;
    }

    return totalRisk / dependencies.length;
  }

  /**
   * Calculate environment-based risk factor
   */
  private calculateEnvironmentRisk(environment: string): number {
    const envRiskMap: Record<string, number> = {
      production: 0.8,
      staging: 0.4,
      development: 0.1,
      test: 0.2,
    };

    return envRiskMap[environment.toLowerCase()] || 0.5;
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private clearCachesForService(serviceId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter((key) =>
      key.includes(serviceId),
    );
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0.85, // This would be calculated from actual hit/miss tracking
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }
}
