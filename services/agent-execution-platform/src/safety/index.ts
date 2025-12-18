/**
 * Comprehensive Safety Layer
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  SafetyConfig,
  SafetyCheck,
  SafetyRule,
  SafetyViolation,
  SafetyReport,
  SafetyAction,
  PIIDetectionResult,
  PIIEntity,
} from '../types/index.js';
import { logger } from '../logging/index.js';

export class SafetyValidator {
  private config: SafetyConfig;
  private ajv: Ajv;
  private rules: Map<string, SafetyRule>;

  constructor(config: SafetyConfig) {
    this.config = config;
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.rules = new Map();

    this.initializeRules();
  }

  private initializeRules(): void {
    // Default safety rules
    const defaultRules: SafetyRule[] = [
      {
        id: 'no-sql-injection',
        name: 'SQL Injection Detection',
        check: 'injection-detection',
        severity: 'critical',
        pattern: "(?i)(union|select|insert|update|delete|drop|';|--|/\\*)",
        action: 'block',
        enabled: true,
      },
      {
        id: 'no-script-injection',
        name: 'Script Injection Detection',
        check: 'injection-detection',
        severity: 'critical',
        pattern: '(?i)(<script|javascript:|on\\w+=|eval\\()',
        action: 'block',
        enabled: true,
      },
      {
        id: 'rate-limit-check',
        name: 'Rate Limiting',
        check: 'rate-limiting',
        severity: 'warning',
        action: 'block',
        enabled: true,
      },
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }

    // Add custom rules from config
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        this.rules.set(rule.id, rule);
      }
    }
  }

  async validate(input: any, executionId: string): Promise<SafetyReport> {
    const violations: SafetyViolation[] = [];
    const timestamp = new Date();

    logger.getLogger().debug('Starting safety validation', {
      executionId,
      checks: this.config.enabledChecks,
    });

    // Input validation
    if (this.config.enabledChecks.includes('input-validation')) {
      const inputViolations = await this.validateInput(input);
      violations.push(...inputViolations);
    }

    // PII detection
    if (this.config.enabledChecks.includes('pii-detection')) {
      const piiViolations = await this.detectPII(input);
      violations.push(...piiViolations);
    }

    // Malicious content detection
    if (this.config.enabledChecks.includes('malicious-content')) {
      const contentViolations = await this.detectMaliciousContent(input);
      violations.push(...contentViolations);
    }

    // Injection detection
    if (this.config.enabledChecks.includes('injection-detection')) {
      const injectionViolations = await this.detectInjection(input);
      violations.push(...injectionViolations);
    }

    const passed = violations.length === 0 ||
      violations.every((v) => v.action !== 'block');

    const report: SafetyReport = {
      passed,
      violations,
      timestamp,
      executionId,
    };

    if (!passed) {
      logger.getLogger().warn('Safety validation failed', {
        executionId,
        violationCount: violations.length,
        violations: violations.map((v) => v.ruleId),
      });
    }

    return report;
  }

  private async validateInput(input: any): Promise<SafetyViolation[]> {
    const violations: SafetyViolation[] = [];

    // Check for null/undefined
    if (input === null || input === undefined) {
      violations.push({
        ruleId: 'input-null-check',
        check: 'input-validation',
        severity: 'error',
        message: 'Input cannot be null or undefined',
        details: { input },
        timestamp: new Date(),
        action: 'block',
      });
    }

    return violations;
  }

  private async detectPII(content: string): Promise<SafetyViolation[]> {
    const violations: SafetyViolation[] = [];
    const result = await this.runPIIDetection(content);

    if (result.found) {
      violations.push({
        ruleId: 'pii-detected',
        check: 'pii-detection',
        severity: 'warning',
        message: 'PII entities detected in content',
        details: {
          entities: result.entities,
          confidence: result.confidence,
        },
        timestamp: new Date(),
        action: 'sanitize',
      });
    }

    return violations;
  }

  private async runPIIDetection(content: string): Promise<PIIDetectionResult> {
    const entities: PIIEntity[] = [];

    // Email detection
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(content)) !== null) {
      entities.push({
        type: 'email',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.95,
      });
    }

    // Phone number detection (US format)
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    while ((match = phoneRegex.exec(content)) !== null) {
      entities.push({
        type: 'phone',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.85,
      });
    }

    // SSN detection
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    while ((match = ssnRegex.exec(content)) !== null) {
      entities.push({
        type: 'ssn',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.9,
      });
    }

    return {
      found: entities.length > 0,
      entities,
      confidence: entities.length > 0
        ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
        : 0,
    };
  }

  private async detectMaliciousContent(input: any): Promise<SafetyViolation[]> {
    const violations: SafetyViolation[] = [];
    const content = typeof input === 'string' ? input : JSON.stringify(input);

    // Check against patterns
    for (const [ruleId, rule] of this.rules) {
      if (rule.check === 'malicious-content' && rule.pattern && rule.enabled) {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(content)) {
          violations.push({
            ruleId,
            check: rule.check,
            severity: rule.severity,
            message: 'Malicious content pattern detected: ' + rule.name,
            details: { pattern: rule.pattern },
            timestamp: new Date(),
            action: rule.action,
          });
        }
      }
    }

    return violations;
  }

  private async detectInjection(input: any): Promise<SafetyViolation[]> {
    const violations: SafetyViolation[] = [];
    const content = typeof input === 'string' ? input : JSON.stringify(input);

    // Check injection patterns
    for (const [ruleId, rule] of this.rules) {
      if (rule.check === 'injection-detection' && rule.pattern && rule.enabled) {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(content)) {
          violations.push({
            ruleId,
            check: rule.check,
            severity: rule.severity,
            message: 'Injection pattern detected: ' + rule.name,
            details: { pattern: rule.pattern },
            timestamp: new Date(),
            action: rule.action,
          });
        }
      }
    }

    return violations;
  }

  sanitize(content: string, report: SafetyReport): string {
    let sanitized = content;

    for (const violation of report.violations) {
      if (violation.action === 'sanitize' && violation.check === 'pii-detection') {
        const entities = violation.details.entities as PIIEntity[];
        for (const entity of entities) {
          const replacement = '[REDACTED_' + entity.type.toUpperCase() + ']';
          sanitized = sanitized.substring(0, entity.start) +
            replacement +
            sanitized.substring(entity.end);
        }
      }
    }

    return sanitized;
  }

  addRule(rule: SafetyRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  getRules(): SafetyRule[] {
    return Array.from(this.rules.values());
  }
}

export class RateLimiter {
  private requests: Map<string, number[]>;
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.requests = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    let timestamps = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    timestamps.push(now);
    this.requests.set(identifier, timestamps);

    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  getRemaining(identifier: string): number {
    const timestamps = this.requests.get(identifier) || [];
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const validRequests = timestamps.filter((ts) => ts > windowStart);

    return Math.max(0, this.maxRequests - validRequests.length);
  }
}
