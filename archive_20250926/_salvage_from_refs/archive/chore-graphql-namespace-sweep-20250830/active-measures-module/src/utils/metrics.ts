/*
import express from 'express';
import logger from './logger';

// Metrics collection for Active Measures module
class MetricsCollector {
  private metrics: Map<string, any> = new Map();
  private startTime: number = Date.now();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('operations_total', 0);
    this.metrics.set('operations_success', 0);
    this.metrics.set('operations_failed', 0);
    this.metrics.set('simulations_total', 0);
    this.metrics.set('simulations_completed', 0);
    this.metrics.set('audit_entries_total', 0);
    this.metrics.set('security_violations', 0);
    this.metrics.set('classification_breaches', 0);
    this.metrics.set('effectiveness_scores', []);
    this.metrics.set('response_times', []);
  }

  incrementCounter(metric: string, value: number = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
    logger.debug('Metric incremented', { metric, value, newTotal: current + value });
  }

  recordHistogram(metric: string, value: number): void {
    const values = this.metrics.get(metric) || [];
    values.push(value);
    // Keep only last 1000 values for memory efficiency
    if (values.length > 1000) {
      values.shift();
    }
    this.metrics.set(metric, values);
  }

  setGauge(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }

  getMetric(metric: string): any {
    return this.metrics.get(metric);
  }

  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.metrics.entries()) {
      if (Array.isArray(value)) {
        result[key] = {
          count: value.length,
          avg: value.reduce((a, b) => a + b, 0) / value.length || 0,
          min: Math.min(...value) || 0,
          max: Math.max(...value) || 0,
        };
      } else {
        result[key] = value;
      }
    }
    
    result.uptime_seconds = Math.floor((Date.now() - this.startTime) / 1000);
    return result;
  }

  // Calculate operation success rate
  getSuccessRate(): number {
    const total = this.getMetric('operations_total') || 0;
    const success = this.getMetric('operations_success') || 0;
    return total > 0 ? (success / total) * 100 : 0;
  }

  // Calculate average effectiveness score
  getAverageEffectiveness(): number {
    const scores = this.getMetric('effectiveness_scores') || [];
    return scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
  }

  // Get response time percentiles
  getResponseTimePercentiles(): any {
    const times = this.getMetric('response_times') || [];
    if (times.length === 0) return { p50: 0, p95: 0, p99: 0 };
    
    const sorted = times.sort((a: number, b: number) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
}

export const metricsCollector = new MetricsCollector();

// Express middleware for metrics collection
export function metricsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    metricsCollector.recordHistogram('response_times', duration);
    
    // Track operation-specific metrics
    if (req.path.includes('/graphql')) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        metricsCollector.incrementCounter('graphql_requests_success');
      } else {
        metricsCollector.incrementCounter('graphql_requests_failed');
      }
    }
    
    // Security metrics
    if (res.statusCode === 401 || res.statusCode === 403) {
      metricsCollector.incrementCounter('security_violations');
    }
  });
  
  next();
}

// Setup metrics endpoint
export function setupMetrics(app: express.Application): void {
  app.get('/metrics', (req, res) => {
    try {
      const metrics = metricsCollector.getAllMetrics();
      const successRate = metricsCollector.getSuccessRate();
      const avgEffectiveness = metricsCollector.getAverageEffectiveness();
      const responseTimePercentiles = metricsCollector.getResponseTimePercentiles();
      
      const response = {
        timestamp: new Date().toISOString(),
        service: 'active-measures-module',
        version: '2.0.0-military-spec',
        metrics,
        kpis: {
          success_rate_percent: successRate,
          average_effectiveness_score: avgEffectiveness,
          response_time_percentiles: responseTimePercentiles,
        },
        health: {
          status: 'healthy',
          uptime_seconds: metrics.uptime_seconds,
        },
      };
      
      res.json(response);
    } catch (error) {
      logger.error('Failed to generate metrics', { error: error.message });
      res.status(500).json({ error: 'Failed to generate metrics' });
    }
  });
  
  logger.info('Metrics endpoint configured at /metrics');
}

export default metricsCollector;
*/