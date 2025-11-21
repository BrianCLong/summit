/**
 * Cost Anomaly Detection and Budget Alert Service
 *
 * Monitors cost patterns, detects anomalies, and sends alerts when
 * budgets are at risk or unusual spending patterns are detected.
 */

import pino from 'pino';
import { getPostgresPool } from '../db/postgres';
import { resourceTagging, TagCategory } from './ResourceTaggingService';

const logger = pino({ name: 'cost-anomaly-detection' });

export interface BudgetAlert {
  id: string;
  alertType: 'budget_threshold' | 'cost_anomaly' | 'projected_overrun' | 'waste_detected';
  severity: 'info' | 'warning' | 'critical';
  dimension: string; // team, project, cost_center, etc.
  dimensionValue: string;
  message: string;
  currentCost: number;
  budgetLimit?: number;
  projectedCost?: number;
  threshold?: number;
  recommendations: string[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BudgetThreshold {
  dimension: string;
  dimensionValue: string;
  dailyLimit: number;
  monthlyLimit: number;
  warningThreshold: number; // Percentage (e.g., 80 for 80%)
  criticalThreshold: number; // Percentage (e.g., 95 for 95%)
}

export interface AnomalyDetectionConfig {
  lookbackPeriodDays: number;
  stdDevThreshold: number; // Number of standard deviations for anomaly
  minDataPoints: number; // Minimum data points needed for detection
  alertCooldownMinutes: number; // Minutes between repeat alerts
}

export class CostAnomalyDetectionService {
  private db = getPostgresPool();
  private budgetThresholds = new Map<string, BudgetThreshold>();
  private recentAlerts = new Map<string, Date>();

  private defaultConfig: AnomalyDetectionConfig = {
    lookbackPeriodDays: 14,
    stdDevThreshold: 2.5,
    minDataPoints: 7,
    alertCooldownMinutes: 60,
  };

  constructor() {
    this.initializeDatabase();
    this.loadBudgetThresholds();
    this.startPeriodicChecks();
  }

  /**
   * Initialize database tables for alerts
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.db.write(`
        CREATE TABLE IF NOT EXISTS budget_thresholds (
          id SERIAL PRIMARY KEY,
          dimension VARCHAR(100) NOT NULL,
          dimension_value VARCHAR(255) NOT NULL,
          daily_limit DECIMAL(12, 2) NOT NULL,
          monthly_limit DECIMAL(12, 2) NOT NULL,
          warning_threshold INTEGER DEFAULT 80,
          critical_threshold INTEGER DEFAULT 95,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(dimension, dimension_value)
        );

        CREATE TABLE IF NOT EXISTS cost_alerts (
          id SERIAL PRIMARY KEY,
          alert_type VARCHAR(100) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          dimension VARCHAR(100) NOT NULL,
          dimension_value VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          current_cost DECIMAL(12, 6),
          budget_limit DECIMAL(12, 2),
          projected_cost DECIMAL(12, 6),
          threshold_percent INTEGER,
          recommendations JSONB,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          acknowledged BOOLEAN DEFAULT FALSE,
          acknowledged_at TIMESTAMP,
          acknowledged_by VARCHAR(255),
          INDEX idx_cost_alerts_dimension (dimension, dimension_value, created_at),
          INDEX idx_cost_alerts_type (alert_type, severity, created_at),
          INDEX idx_cost_alerts_unacknowledged (acknowledged, created_at)
        );

        CREATE TABLE IF NOT EXISTS anomaly_baselines (
          id SERIAL PRIMARY KEY,
          dimension VARCHAR(100) NOT NULL,
          dimension_value VARCHAR(255) NOT NULL,
          metric_name VARCHAR(100) NOT NULL,
          baseline_value DECIMAL(12, 6) NOT NULL,
          std_deviation DECIMAL(12, 6) NOT NULL,
          sample_count INTEGER NOT NULL,
          calculated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(dimension, dimension_value, metric_name)
        );
      `);

      logger.info('Cost anomaly detection database initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize anomaly detection database');
      throw error;
    }
  }

  /**
   * Load budget thresholds from database
   */
  private async loadBudgetThresholds(): Promise<void> {
    try {
      const result = await this.db.read('SELECT * FROM budget_thresholds');

      for (const row of result.rows) {
        const key = `${row.dimension}:${row.dimension_value}`;
        this.budgetThresholds.set(key, {
          dimension: row.dimension,
          dimensionValue: row.dimension_value,
          dailyLimit: parseFloat(row.daily_limit),
          monthlyLimit: parseFloat(row.monthly_limit),
          warningThreshold: parseInt(row.warning_threshold),
          criticalThreshold: parseInt(row.critical_threshold),
        });
      }

      logger.info(
        { count: this.budgetThresholds.size },
        'Budget thresholds loaded',
      );
    } catch (error) {
      logger.error({ error }, 'Failed to load budget thresholds');
    }
  }

  /**
   * Set budget threshold for a dimension
   */
  async setBudgetThreshold(threshold: BudgetThreshold): Promise<void> {
    try {
      await this.db.write(
        `INSERT INTO budget_thresholds
         (dimension, dimension_value, daily_limit, monthly_limit, warning_threshold, critical_threshold)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (dimension, dimension_value)
         DO UPDATE SET
           daily_limit = EXCLUDED.daily_limit,
           monthly_limit = EXCLUDED.monthly_limit,
           warning_threshold = EXCLUDED.warning_threshold,
           critical_threshold = EXCLUDED.critical_threshold,
           updated_at = NOW()`,
        [
          threshold.dimension,
          threshold.dimensionValue,
          threshold.dailyLimit,
          threshold.monthlyLimit,
          threshold.warningThreshold,
          threshold.criticalThreshold,
        ],
      );

      const key = `${threshold.dimension}:${threshold.dimensionValue}`;
      this.budgetThresholds.set(key, threshold);

      logger.info({ threshold }, 'Budget threshold set');
    } catch (error) {
      logger.error({ error, threshold }, 'Failed to set budget threshold');
      throw error;
    }
  }

  /**
   * Check budget compliance for a dimension
   */
  async checkBudgetCompliance(
    dimension: string,
    dimensionValue: string,
  ): Promise<BudgetAlert[]> {
    const key = `${dimension}:${dimensionValue}`;
    const threshold = this.budgetThresholds.get(key);

    if (!threshold) {
      return [];
    }

    const alerts: BudgetAlert[] = [];
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      // Get daily and monthly costs
      const [dailyResult, monthlyResult] = await Promise.all([
        this.db.read(
          `SELECT COALESCE(SUM(rc.cost), 0) as total
           FROM resource_costs rc
           JOIN resource_tags rt ON rc.resource_id = rt.resource_id
           WHERE rt.tag_category = $1 AND rt.tag_value = $2
             AND rc.timestamp >= $3`,
          [dimension, dimensionValue, startOfDay],
        ),
        this.db.read(
          `SELECT COALESCE(SUM(rc.cost), 0) as total
           FROM resource_costs rc
           JOIN resource_tags rt ON rc.resource_id = rt.resource_id
           WHERE rt.tag_category = $1 AND rt.tag_value = $2
             AND rc.timestamp >= $3`,
          [dimension, dimensionValue, startOfMonth],
        ),
      ]);

      const dailyCost = parseFloat(dailyResult.rows[0].total);
      const monthlyCost = parseFloat(monthlyResult.rows[0].total);

      // Check daily budget
      const dailyUtilization = (dailyCost / threshold.dailyLimit) * 100;
      if (dailyUtilization >= threshold.criticalThreshold) {
        alerts.push(this.createBudgetAlert({
          alertType: 'budget_threshold',
          severity: 'critical',
          dimension,
          dimensionValue,
          message: `Daily budget critically exceeded: ${dailyUtilization.toFixed(1)}% used`,
          currentCost: dailyCost,
          budgetLimit: threshold.dailyLimit,
          threshold: threshold.criticalThreshold,
          recommendations: [
            'Immediate action required to prevent cost overrun',
            'Review and pause non-essential resources',
            'Check for runaway queries or processes',
          ],
        }));
      } else if (dailyUtilization >= threshold.warningThreshold) {
        alerts.push(this.createBudgetAlert({
          alertType: 'budget_threshold',
          severity: 'warning',
          dimension,
          dimensionValue,
          message: `Daily budget warning: ${dailyUtilization.toFixed(1)}% used`,
          currentCost: dailyCost,
          budgetLimit: threshold.dailyLimit,
          threshold: threshold.warningThreshold,
          recommendations: [
            'Monitor resource usage closely',
            'Consider optimizing expensive operations',
          ],
        }));
      }

      // Check monthly budget with projection
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const dayOfMonth = now.getDate();
      const projectedMonthlyCost = (monthlyCost / dayOfMonth) * daysInMonth;

      if (projectedMonthlyCost > threshold.monthlyLimit) {
        const overage = projectedMonthlyCost - threshold.monthlyLimit;
        const overagePercent = (overage / threshold.monthlyLimit) * 100;

        alerts.push(this.createBudgetAlert({
          alertType: 'projected_overrun',
          severity: overagePercent > 20 ? 'critical' : 'warning',
          dimension,
          dimensionValue,
          message: `Projected to exceed monthly budget by $${overage.toFixed(2)} (${overagePercent.toFixed(1)}%)`,
          currentCost: monthlyCost,
          budgetLimit: threshold.monthlyLimit,
          projectedCost: projectedMonthlyCost,
          recommendations: [
            'Review cost trends and identify optimization opportunities',
            'Consider increasing budget or reducing resource usage',
            `Daily target to stay on budget: $${(threshold.monthlyLimit / daysInMonth).toFixed(2)}`,
          ],
        }));
      }

      // Save alerts to database
      for (const alert of alerts) {
        await this.saveAlert(alert);
      }

      return alerts;
    } catch (error) {
      logger.error({ error, dimension, dimensionValue }, 'Failed to check budget compliance');
      return [];
    }
  }

  /**
   * Detect cost anomalies using statistical analysis
   */
  async detectCostAnomalies(
    dimension: string,
    dimensionValue: string,
    config: Partial<AnomalyDetectionConfig> = {},
  ): Promise<BudgetAlert[]> {
    const detectionConfig = { ...this.defaultConfig, ...config };
    const alerts: BudgetAlert[] = [];

    try {
      const lookbackStart = new Date();
      lookbackStart.setDate(lookbackStart.getDate() - detectionConfig.lookbackPeriodDays);

      // Get historical daily costs
      const result = await this.db.read(
        `SELECT DATE(rc.timestamp) as date, SUM(rc.cost) as daily_cost
         FROM resource_costs rc
         JOIN resource_tags rt ON rc.resource_id = rt.resource_id
         WHERE rt.tag_category = $1 AND rt.tag_value = $2
           AND rc.timestamp >= $3
         GROUP BY DATE(rc.timestamp)
         ORDER BY date`,
        [dimension, dimensionValue, lookbackStart],
      );

      if (result.rows.length < detectionConfig.minDataPoints) {
        logger.debug(
          { dimension, dimensionValue, dataPoints: result.rows.length },
          'Insufficient data for anomaly detection',
        );
        return [];
      }

      // Calculate baseline and standard deviation
      const costs = result.rows.map((r) => parseFloat(r.daily_cost));
      const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
      const variance = costs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / costs.length;
      const stdDev = Math.sqrt(variance);

      // Check today's cost against baseline
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayResult = await this.db.read(
        `SELECT COALESCE(SUM(rc.cost), 0) as today_cost
         FROM resource_costs rc
         JOIN resource_tags rt ON rc.resource_id = rt.resource_id
         WHERE rt.tag_category = $1 AND rt.tag_value = $2
           AND rc.timestamp >= $3`,
        [dimension, dimensionValue, todayStart],
      );

      const todayCost = parseFloat(todayResult.rows[0].today_cost);
      const zScore = (todayCost - mean) / stdDev;

      // Anomaly detected if z-score exceeds threshold
      if (Math.abs(zScore) >= detectionConfig.stdDevThreshold) {
        const severity = Math.abs(zScore) >= detectionConfig.stdDevThreshold + 1
          ? 'critical'
          : 'warning';

        const alert = this.createBudgetAlert({
          alertType: 'cost_anomaly',
          severity,
          dimension,
          dimensionValue,
          message: `Cost anomaly detected: ${todayCost > mean ? 'spike' : 'drop'} of ${Math.abs(zScore).toFixed(1)}σ from baseline`,
          currentCost: todayCost,
          recommendations: [
            `Baseline daily cost: $${mean.toFixed(2)} ± $${stdDev.toFixed(2)}`,
            'Investigate recent changes in resource usage',
            todayCost > mean
              ? 'Check for expensive operations or increased traffic'
              : 'Verify services are running normally',
          ],
          metadata: {
            zScore,
            baseline: mean,
            stdDev,
            historicalDataPoints: costs.length,
          },
        });

        alerts.push(alert);
        await this.saveAlert(alert);

        // Update baseline
        await this.updateAnomalyBaseline(dimension, dimensionValue, mean, stdDev, costs.length);
      }

      return alerts;
    } catch (error) {
      logger.error({ error, dimension, dimensionValue }, 'Failed to detect anomalies');
      return [];
    }
  }

  /**
   * Detect waste (idle or underutilized resources)
   */
  async detectWaste(): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];

    try {
      // Find resources with low utilization and significant cost
      const result = await this.db.read(
        `SELECT rc.resource_id, rc.resource_type,
                SUM(rc.cost) as total_cost,
                COUNT(*) as sample_count
         FROM resource_costs rc
         WHERE rc.timestamp >= NOW() - INTERVAL '24 hours'
         GROUP BY rc.resource_id, rc.resource_type
         HAVING SUM(rc.cost) > 1.0
         ORDER BY total_cost DESC
         LIMIT 50`,
      );

      for (const row of result.rows) {
        const cost = parseFloat(row.total_cost);

        if (cost > 5.0) { // Significant cost threshold
          const alert = this.createBudgetAlert({
            alertType: 'waste_detected',
            severity: cost > 20 ? 'warning' : 'info',
            dimension: 'resource',
            dimensionValue: row.resource_id,
            message: `Potentially idle resource costing $${cost.toFixed(2)}/day`,
            currentCost: cost,
            recommendations: [
              'Review resource utilization metrics',
              'Consider downsizing or terminating if not needed',
              'Check if resource can be moved to spot/preemptible instances',
            ],
            metadata: {
              resourceType: row.resource_type,
              resourceId: row.resource_id,
            },
          });

          alerts.push(alert);
          await this.saveAlert(alert);
        }
      }

      return alerts;
    } catch (error) {
      logger.error({ error }, 'Failed to detect waste');
      return [];
    }
  }

  /**
   * Create a budget alert object
   */
  private createBudgetAlert(config: {
    alertType: BudgetAlert['alertType'];
    severity: BudgetAlert['severity'];
    dimension: string;
    dimensionValue: string;
    message: string;
    currentCost: number;
    budgetLimit?: number;
    projectedCost?: number;
    threshold?: number;
    recommendations: string[];
    metadata?: Record<string, any>;
  }): BudgetAlert {
    return {
      id: `${config.dimension}:${config.dimensionValue}:${config.alertType}:${Date.now()}`,
      ...config,
      timestamp: new Date(),
    };
  }

  /**
   * Save alert to database
   */
  private async saveAlert(alert: BudgetAlert): Promise<void> {
    // Check cooldown period
    const cooldownKey = `${alert.dimension}:${alert.dimensionValue}:${alert.alertType}`;
    const lastAlert = this.recentAlerts.get(cooldownKey);

    if (lastAlert) {
      const minutesSinceLastAlert = (Date.now() - lastAlert.getTime()) / 1000 / 60;
      if (minutesSinceLastAlert < this.defaultConfig.alertCooldownMinutes) {
        logger.debug({ alert: cooldownKey }, 'Alert suppressed due to cooldown');
        return;
      }
    }

    try {
      await this.db.write(
        `INSERT INTO cost_alerts
         (alert_type, severity, dimension, dimension_value, message,
          current_cost, budget_limit, projected_cost, threshold_percent,
          recommendations, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          alert.alertType,
          alert.severity,
          alert.dimension,
          alert.dimensionValue,
          alert.message,
          alert.currentCost,
          alert.budgetLimit,
          alert.projectedCost,
          alert.threshold,
          JSON.stringify(alert.recommendations),
          alert.metadata ? JSON.stringify(alert.metadata) : null,
        ],
      );

      this.recentAlerts.set(cooldownKey, new Date());

      logger.warn(
        {
          alert: alert.id,
          type: alert.alertType,
          severity: alert.severity,
          dimension: alert.dimension,
          dimensionValue: alert.dimensionValue,
        },
        alert.message,
      );

      // TODO: Send notifications (email, Slack, PagerDuty, etc.)
      await this.sendAlertNotification(alert);
    } catch (error) {
      logger.error({ error, alert }, 'Failed to save alert');
    }
  }

  /**
   * Update anomaly baseline
   */
  private async updateAnomalyBaseline(
    dimension: string,
    dimensionValue: string,
    baseline: number,
    stdDev: number,
    sampleCount: number,
  ): Promise<void> {
    try {
      await this.db.write(
        `INSERT INTO anomaly_baselines
         (dimension, dimension_value, metric_name, baseline_value, std_deviation, sample_count)
         VALUES ($1, $2, 'daily_cost', $3, $4, $5)
         ON CONFLICT (dimension, dimension_value, metric_name)
         DO UPDATE SET
           baseline_value = EXCLUDED.baseline_value,
           std_deviation = EXCLUDED.std_deviation,
           sample_count = EXCLUDED.sample_count,
           calculated_at = NOW()`,
        [dimension, dimensionValue, baseline, stdDev, sampleCount],
      );
    } catch (error) {
      logger.error({ error }, 'Failed to update anomaly baseline');
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: BudgetAlert): Promise<void> {
    // TODO: Implement notification channels (email, Slack, webhooks, etc.)
    logger.info({ alert }, 'Alert notification would be sent');
  }

  /**
   * Start periodic budget and anomaly checks
   */
  private startPeriodicChecks(): void {
    // Run every 15 minutes
    setInterval(async () => {
      try {
        logger.debug('Running periodic cost checks');

        // Check budgets for all configured thresholds
        for (const [key, threshold] of this.budgetThresholds) {
          await this.checkBudgetCompliance(threshold.dimension, threshold.dimensionValue);
          await this.detectCostAnomalies(threshold.dimension, threshold.dimensionValue);
        }

        // Check for waste
        await this.detectWaste();
      } catch (error) {
        logger.error({ error }, 'Failed to run periodic cost checks');
      }
    }, 15 * 60 * 1000);

    logger.info('Periodic cost checks started');
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(
    limit: number = 50,
    severity?: string,
    acknowledged?: boolean,
  ): Promise<BudgetAlert[]> {
    try {
      let query = `
        SELECT * FROM cost_alerts
        WHERE 1=1
      `;
      const params: any[] = [];

      if (severity) {
        params.push(severity);
        query += ` AND severity = $${params.length}`;
      }

      if (acknowledged !== undefined) {
        params.push(acknowledged);
        query += ` AND acknowledged = $${params.length}`;
      }

      params.push(limit);
      query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

      const result = await this.db.read(query, params);

      return result.rows.map((row) => ({
        id: row.id.toString(),
        alertType: row.alert_type,
        severity: row.severity,
        dimension: row.dimension,
        dimensionValue: row.dimension_value,
        message: row.message,
        currentCost: parseFloat(row.current_cost),
        budgetLimit: row.budget_limit ? parseFloat(row.budget_limit) : undefined,
        projectedCost: row.projected_cost ? parseFloat(row.projected_cost) : undefined,
        threshold: row.threshold_percent,
        recommendations: row.recommendations,
        timestamp: row.created_at,
        metadata: row.metadata,
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to get recent alerts');
      return [];
    }
  }
}

// Singleton instance
export const costAnomalyDetection = new CostAnomalyDetectionService();
