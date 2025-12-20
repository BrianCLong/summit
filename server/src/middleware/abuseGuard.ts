/**
 * Maestro Conductor v24.4.0 - Abuse Detection & Mitigation
 * Epic E19: Advanced Abuse/Misuse Detection & Mitigation
 *
 * Rate anomaly detection with auto-throttling capabilities
 * Implements sliding window analysis with z-score spike detection
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { PrometheusMetrics } from '../utils/metrics';
import logger from '../utils/logger';
import { tracer, Span } from '../utils/tracing';

// Configuration interface
interface AbuseGuardConfig {
  enabled: boolean;
  windowSizeMinutes: number;
  anomalyThreshold: number; // Z-score threshold for anomaly detection
  spikeMultiplier: number; // Multiplier for sudden spike detection (e.g., 10x)
  throttleDurationMinutes: number;
  maxRequestsPerWindow: number;
  alertWebhookUrl?: string;
  bypassTokens: string[];
}

// Rate window data structure
interface RateWindow {
  timestamp: number;
  count: number;
  tenantId: string;
}

// Anomaly detection result
interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  currentRate: number;
  baselineRate: number;
  confidence: number;
  type: 'spike' | 'sustained' | 'normal';
}

// Throttle state
interface ThrottleState {
  tenantId: string;
  startTime: number;
  endTime: number;
  reason: string;
  severity: 'warning' | 'critical';
}

export class AbuseGuard {
  private config: AbuseGuardConfig;
  private redis: Redis;
  private metrics: PrometheusMetrics;
  private throttledTenants: Map<string, ThrottleState> = new Map();

  constructor(config: Partial<AbuseGuardConfig> = {}) {
    this.config = {
      enabled: true,
      windowSizeMinutes: 10,
      anomalyThreshold: 3.0, // 3 standard deviations
      spikeMultiplier: 10,
      throttleDurationMinutes: 30,
      maxRequestsPerWindow: 1000,
      bypassTokens: [],
      ...config,
    };

    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.metrics = new PrometheusMetrics('abuse_guard');
    this.initializeMetrics();
    this.startCleanupTask();
  }

  private initializeMetrics(): void {
    this.metrics.createCounter('requests_total', 'Total requests processed', [
      'tenant_id',
      'status',
    ]);
    this.metrics.createCounter('anomalies_detected', 'Anomalies detected', [
      'tenant_id',
      'type',
    ]);
    this.metrics.createCounter('throttles_applied', 'Throttles applied', [
      'tenant_id',
      'reason',
    ]);
    this.metrics.createGauge(
      'throttled_tenants',
      'Currently throttled tenants',
    );
    this.metrics.createHistogram(
      'rate_analysis_duration',
      'Time spent analyzing rates',
      {
        buckets: [0.001, 0.01, 0.1, 1, 5],
      },
    );
  }

  // Express middleware factory
  public middleware() {
    return async (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (!this.config.enabled) {
        return next();
      }

      return tracer.startActiveSpan(
        'abuse_guard.middleware',
        async (span: Span) => {
          try {
            const tenantId = this.extractTenantId(req);
            const bypass = this.checkBypassToken(req);

            span.setAttributes({
              'abuse_guard.tenant_id': tenantId,
              'abuse_guard.bypass': bypass,
            });

            if (bypass) {
              logger.debug('Request bypassing abuse guard', {
                tenantId,
                bypass: true,
              });
              this.metrics.incrementCounter('requests_total', {
                tenant_id: tenantId,
                status: 'bypassed',
              });
              return next();
            }

            // Check if tenant is currently throttled
            if (this.isThrottled(tenantId)) {
              const throttleState = this.throttledTenants.get(tenantId)!;

              logger.warn('Request throttled', {
                tenantId,
                reason: throttleState.reason,
                remainingTime: throttleState.endTime - Date.now(),
              });

              this.metrics.incrementCounter('requests_total', {
                tenant_id: tenantId,
                status: 'throttled',
              });

              res.status(429).json({
                error: 'Rate limit exceeded',
                message:
                  'Tenant is temporarily throttled due to anomalous activity',
                retryAfter: Math.ceil(
                  (throttleState.endTime - Date.now()) / 1000,
                ),
                severity: throttleState.severity,
              });
              return;
            }

            // Record the request and analyze for anomalies
            const anomalyResult = await this.recordAndAnalyze(tenantId);

            if (anomalyResult.isAnomaly) {
              await this.handleAnomaly(tenantId, anomalyResult);

              // If anomaly triggered throttling, block this request
              if (this.isThrottled(tenantId)) {
                this.metrics.incrementCounter('requests_total', {
                  tenant_id: tenantId,
                  status: 'throttled_new',
                });

                res.status(429).json({
                  error: 'Rate limit exceeded',
                  message: 'Anomalous activity detected - throttling applied',
                  retryAfter: this.config.throttleDurationMinutes * 60,
                  anomaly: {
                    type: anomalyResult.type,
                    zScore: anomalyResult.zScore,
                    currentRate: anomalyResult.currentRate,
                  },
                });
                return;
              }
            }

            this.metrics.incrementCounter('requests_total', {
              tenant_id: tenantId,
              status: 'allowed',
            });
            next();
          } catch (error) {
            logger.error('Abuse guard error', { error: error.message });
            span.recordException(error as Error);

            // Fail open - allow request but log error
            this.metrics.incrementCounter('requests_total', {
              tenant_id: 'unknown',
              status: 'error',
            });
            next();
          }
        },
      );
    };
  }

  private extractTenantId(req: Request): string {
    // Try multiple sources for tenant ID
    return (
      (req.headers['x-tenant-id'] as string) ||
      req.body?.tenantId ||
      (req.query.tenantId as string) ||
      req.user?.tenantId ||
      'default'
    );
  }

  private checkBypassToken(req: Request): boolean {
    const token = req.headers['x-bypass-token'] as string;
    return token && this.config.bypassTokens.includes(token);
  }

  private isThrottled(tenantId: string): boolean {
    const throttleState = this.throttledTenants.get(tenantId);
    if (!throttleState) return false;

    if (Date.now() > throttleState.endTime) {
      this.throttledTenants.delete(tenantId);
      this.updateThrottledTenantsMetric();
      return false;
    }

    return true;
  }

  private async recordAndAnalyze(tenantId: string): Promise<AnomalyResult> {
    const startTime = Date.now();

    try {
      // Record current request
      const windowKey = this.getWindowKey(tenantId);
      const currentWindow = Math.floor(
        Date.now() / (this.config.windowSizeMinutes * 60 * 1000),
      );

      await this.redis.zAdd(windowKey, {
        score: currentWindow,
        value: Date.now().toString(),
      });

      // Set expiration for cleanup
      await this.redis.expire(
        windowKey,
        this.config.windowSizeMinutes * 60 * 2,
      );

      // Get recent windows for analysis
      const recentWindows = await this.getRecentWindows(tenantId);
      const anomalyResult = this.analyzeForAnomalies(recentWindows);

      this.metrics.observeHistogram(
        'rate_analysis_duration',
        (Date.now() - startTime) / 1000,
      );

      return anomalyResult;
    } catch (error) {
      logger.error('Error in rate analysis', {
        tenantId,
        error: error.message,
      });
      return {
        isAnomaly: false,
        zScore: 0,
        currentRate: 0,
        baselineRate: 0,
        confidence: 0,
        type: 'normal',
      };
    }
  }

  private async getRecentWindows(tenantId: string): Promise<RateWindow[]> {
    const windowKey = this.getWindowKey(tenantId);
    const currentWindow = Math.floor(
      Date.now() / (this.config.windowSizeMinutes * 60 * 1000),
    );
    const lookbackWindows = 12; // Look back 12 windows for trend analysis

    const windows: RateWindow[] = [];

    for (let i = 0; i < lookbackWindows; i++) {
      const windowStart = currentWindow - i;
      const windowEnd = windowStart + 1;

      const count = await this.redis.zCount(
        windowKey,
        windowStart,
        windowEnd - 1,
      );

      windows.push({
        timestamp: windowStart * this.config.windowSizeMinutes * 60 * 1000,
        count,
        tenantId,
      });
    }

    return windows.reverse(); // Oldest first
  }

  private analyzeForAnomalies(windows: RateWindow[]): AnomalyResult {
    if (windows.length < 3) {
      return {
        isAnomaly: false,
        zScore: 0,
        currentRate: windows[windows.length - 1]?.count || 0,
        baselineRate: 0,
        confidence: 0,
        type: 'normal',
      };
    }

    const currentRate = windows[windows.length - 1].count;
    const historicalRates = windows.slice(0, -1).map((w) => w.count);

    // Calculate baseline statistics
    const mean =
      historicalRates.reduce((a, b) => a + b, 0) / historicalRates.length;
    const variance =
      historicalRates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      historicalRates.length;
    const stdDev = Math.sqrt(variance);

    // Calculate z-score
    const zScore = stdDev === 0 ? 0 : (currentRate - mean) / stdDev;

    // Check for sudden spike (10x increase)
    const recentMean = historicalRates.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const isSuddenSpike =
      currentRate >= recentMean * this.config.spikeMultiplier;

    // Determine anomaly type and severity
    let isAnomaly = false;
    let type: 'spike' | 'sustained' | 'normal' = 'normal';
    let confidence = 0;

    if (isSuddenSpike && currentRate > this.config.maxRequestsPerWindow / 2) {
      isAnomaly = true;
      type = 'spike';
      confidence = 0.9;
    } else if (Math.abs(zScore) > this.config.anomalyThreshold) {
      isAnomaly = true;
      type = 'sustained';
      confidence = Math.min(
        Math.abs(zScore) / this.config.anomalyThreshold,
        1.0,
      );
    }

    return {
      isAnomaly,
      zScore,
      currentRate,
      baselineRate: mean,
      confidence,
      type,
    };
  }

  private async handleAnomaly(
    tenantId: string,
    anomaly: AnomalyResult,
  ): Promise<void> {
    logger.warn('Anomaly detected', {
      tenantId,
      type: anomaly.type,
      zScore: anomaly.zScore,
      currentRate: anomaly.currentRate,
      baselineRate: anomaly.baselineRate,
      confidence: anomaly.confidence,
    });

    this.metrics.incrementCounter('anomalies_detected', {
      tenant_id: tenantId,
      type: anomaly.type,
    });

    // Determine severity and throttle duration
    let severity: 'warning' | 'critical' = 'warning';
    let throttleDuration = this.config.throttleDurationMinutes;

    if (anomaly.type === 'spike' && anomaly.confidence > 0.8) {
      severity = 'critical';
      throttleDuration = this.config.throttleDurationMinutes * 2; // Double for spikes
    } else if (anomaly.zScore > this.config.anomalyThreshold * 1.5) {
      severity = 'critical';
      throttleDuration = this.config.throttleDurationMinutes * 1.5;
    }

    // Apply throttle
    const throttleState: ThrottleState = {
      tenantId,
      startTime: Date.now(),
      endTime: Date.now() + throttleDuration * 60 * 1000,
      reason: `${anomaly.type} anomaly detected (z-score: ${anomaly.zScore.toFixed(2)})`,
      severity,
    };

    this.throttledTenants.set(tenantId, throttleState);
    this.updateThrottledTenantsMetric();

    this.metrics.incrementCounter('throttles_applied', {
      tenant_id: tenantId,
      reason: anomaly.type,
    });

    // Send alert if configured
    if (this.config.alertWebhookUrl) {
      await this.sendAlert(tenantId, anomaly, throttleState);
    }
  }

  private async sendAlert(
    tenantId: string,
    anomaly: AnomalyResult,
    throttle: ThrottleState,
  ): Promise<void> {
    try {
      const alert = {
        timestamp: new Date().toISOString(),
        tenantId,
        severity: throttle.severity,
        anomaly: {
          type: anomaly.type,
          zScore: anomaly.zScore,
          currentRate: anomaly.currentRate,
          baselineRate: anomaly.baselineRate,
          confidence: anomaly.confidence,
        },
        throttle: {
          duration: throttle.endTime - throttle.startTime,
          reason: throttle.reason,
        },
      };

      const response = await fetch(this.config.alertWebhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`Alert webhook failed: ${response.status}`);
      }

      logger.info('Abuse alert sent', {
        tenantId,
        severity: throttle.severity,
      });
    } catch (error) {
      logger.error('Failed to send abuse alert', {
        tenantId,
        error: error.message,
        webhookUrl: this.config.alertWebhookUrl,
      });
    }
  }

  private getWindowKey(tenantId: string): string {
    return `abuse_guard:rate_windows:${tenantId}`;
  }

  private updateThrottledTenantsMetric(): void {
    this.metrics.setGauge('throttled_tenants', this.throttledTenants.size);
  }

  private startCleanupTask(): void {
    // Clean up expired throttles every minute
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [tenantId, throttleState] of this.throttledTenants.entries()) {
        if (now > throttleState.endTime) {
          this.throttledTenants.delete(tenantId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug('Cleaned expired throttles', { count: cleaned });
        this.updateThrottledTenantsMetric();
      }
    }, 60000);
  }

  // Admin methods
  public getThrottledTenants(): ThrottleState[] {
    return Array.from(this.throttledTenants.values());
  }

  public removeThrottle(tenantId: string): boolean {
    const removed = this.throttledTenants.delete(tenantId);
    if (removed) {
      this.updateThrottledTenantsMetric();
      logger.info('Throttle manually removed', { tenantId });
    }
    return removed;
  }

  public async getRecentStats(tenantId: string): Promise<{
    currentRate: number;
    baselineRate: number;
    recentWindows: RateWindow[];
    isThrottled: boolean;
  }> {
    const windows = await this.getRecentWindows(tenantId);
    const anomaly = this.analyzeForAnomalies(windows);

    return {
      currentRate: anomaly.currentRate,
      baselineRate: anomaly.baselineRate,
      recentWindows: windows.slice(-5), // Last 5 windows
      isThrottled: this.isThrottled(tenantId),
    };
  }
}

// Export singleton instance
export const abuseGuard = new AbuseGuard({
  enabled: process.env.ABUSE_GUARD_ENABLED !== 'false',
  windowSizeMinutes: parseInt(process.env.ABUSE_GUARD_WINDOW_MINUTES || '10'),
  anomalyThreshold: parseFloat(
    process.env.ABUSE_GUARD_ANOMALY_THRESHOLD || '3.0',
  ),
  spikeMultiplier: parseFloat(process.env.ABUSE_GUARD_SPIKE_MULTIPLIER || '10'),
  throttleDurationMinutes: parseInt(
    process.env.ABUSE_GUARD_THROTTLE_DURATION || '30',
  ),
  maxRequestsPerWindow: parseInt(
    process.env.ABUSE_GUARD_MAX_REQUESTS || '1000',
  ),
  alertWebhookUrl: process.env.ABUSE_GUARD_ALERT_WEBHOOK,
  bypassTokens: (process.env.ABUSE_GUARD_BYPASS_TOKENS || '')
    .split(',')
    .filter(Boolean),
});
