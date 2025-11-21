/**
 * Real-time Streaming Data Quality Monitor
 * Monitors data streams for quality issues with event-driven architecture
 */

import { EventEmitter } from 'events';
import { QualityRule, ValidationResult, Violation } from '../types.js';

export interface StreamConfig {
  batchSize: number;
  windowSizeMs: number;
  qualityThreshold: number;
  alertOnViolation: boolean;
}

export interface StreamMetrics {
  recordsProcessed: number;
  recordsFailed: number;
  qualityScore: number;
  violationRate: number;
  throughput: number;
  latencyMs: number;
}

export interface StreamAlert {
  id: string;
  type: 'quality-degradation' | 'rule-violation' | 'anomaly' | 'throughput-drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export class StreamQualityMonitor extends EventEmitter {
  private rules: Map<string, QualityRule> = new Map();
  private metrics: StreamMetrics = {
    recordsProcessed: 0,
    recordsFailed: 0,
    qualityScore: 100,
    violationRate: 0,
    throughput: 0,
    latencyMs: 0,
  };
  private windowStart: number = Date.now();

  constructor(private config: StreamConfig) {
    super();
  }

  registerRule(rule: QualityRule): void {
    this.rules.set(rule.id, rule);
  }

  async processRecord(record: Record<string, any>): Promise<ValidationResult[]> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];

    for (const [_, rule] of this.rules) {
      const result = this.validateRecord(record, rule);
      results.push(result);

      if (!result.passed) {
        this.metrics.recordsFailed++;
        if (this.config.alertOnViolation) {
          this.emitAlert({
            id: `alert_${Date.now()}`,
            type: 'rule-violation',
            severity: rule.severity,
            message: `Rule ${rule.name} violated`,
            timestamp: new Date(),
            metadata: { rule: rule.id, record },
          });
        }
      }
    }

    this.metrics.recordsProcessed++;
    this.metrics.latencyMs = Date.now() - startTime;
    this.updateMetrics();

    this.emit('record:processed', { record, results });
    return results;
  }

  async processBatch(records: Record<string, any>[]): Promise<void> {
    for (const record of records) {
      await this.processRecord(record);
    }
    this.emit('batch:completed', { count: records.length, metrics: this.getMetrics() });
  }

  private validateRecord(record: Record<string, any>, rule: QualityRule): ValidationResult {
    const { passed, violations } = this.evaluateRule(record, rule);
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed,
      severity: rule.severity,
      message: passed ? 'Validation passed' : `Failed: ${rule.name}`,
      affectedRows: passed ? 0 : 1,
      affectedColumns: Object.keys(record),
      violations,
      timestamp: new Date(),
    };
  }

  private evaluateRule(record: Record<string, any>, rule: QualityRule): { passed: boolean; violations: Violation[] } {
    const violations: Violation[] = [];

    switch (rule.type) {
      case 'completeness':
        for (const [col, val] of Object.entries(record)) {
          if (val == null || val === '') {
            violations.push({
              columnName: col,
              currentValue: val,
              expectedValue: 'non-null value',
              message: `Column ${col} is empty or null`,
            });
          }
        }
        break;

      case 'validity':
        if (rule.condition.operator === 'matches' && rule.condition.value) {
          const regex = new RegExp(rule.condition.value);
          for (const [col, val] of Object.entries(record)) {
            if (typeof val === 'string' && !regex.test(val)) {
              violations.push({
                columnName: col,
                currentValue: val,
                expectedValue: `matches ${rule.condition.value}`,
                message: `Column ${col} does not match pattern`,
              });
            }
          }
        }
        break;

      case 'consistency':
        if (rule.condition.operator === 'equals') {
          for (const [col, val] of Object.entries(record)) {
            if (val !== rule.condition.value) {
              violations.push({
                columnName: col,
                currentValue: val,
                expectedValue: rule.condition.value,
                message: `Column ${col} does not equal expected value`,
              });
            }
          }
        }
        break;

      default:
        break;
    }

    return { passed: violations.length === 0, violations };
  }

  private updateMetrics(): void {
    const now = Date.now();
    const windowElapsed = now - this.windowStart;

    if (windowElapsed >= this.config.windowSizeMs) {
      this.metrics.throughput = this.metrics.recordsProcessed / (windowElapsed / 1000);
      this.metrics.violationRate = this.metrics.recordsFailed / Math.max(this.metrics.recordsProcessed, 1);
      this.metrics.qualityScore = (1 - this.metrics.violationRate) * 100;

      if (this.metrics.qualityScore < this.config.qualityThreshold) {
        this.emitAlert({
          id: `alert_${Date.now()}`,
          type: 'quality-degradation',
          severity: 'high',
          message: `Quality score ${this.metrics.qualityScore.toFixed(1)}% below threshold ${this.config.qualityThreshold}%`,
          timestamp: new Date(),
          metadata: { metrics: { ...this.metrics } },
        });
      }

      this.emit('metrics:updated', this.metrics);
      this.windowStart = now;
    }
  }

  private emitAlert(alert: StreamAlert): void {
    this.emit('alert', alert);
  }

  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      recordsProcessed: 0,
      recordsFailed: 0,
      qualityScore: 100,
      violationRate: 0,
      throughput: 0,
      latencyMs: 0,
    };
    this.windowStart = Date.now();
  }
}
