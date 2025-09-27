/**
 * Licensing and TOS Enforcement Engine
 *
 * Enforces license terms, terms of service, and usage restrictions
 * for data exports and API operations. Integrates with privacy
 * reasoner for comprehensive data governance.
 */

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

interface LicenseDefinition {
  id: string;
  name: string;
  version: string;
  type: 'commercial' | 'academic' | 'government' | 'non-profit' | 'internal';
  tier: 'basic' | 'professional' | 'enterprise' | 'unlimited';
  restrictions: LicenseRestriction[];
  permissions: LicensePermission[];
  obligations: LicenseObligation[];
  effectiveDate: Date;
  expiryDate?: Date;
  tenantId: string;
  metadata: Record<string, any>;
}

interface LicenseRestriction {
  type: 'export_volume' | 'api_calls' | 'data_types' | 'geographic' | 'commercial_use' | 'redistribution';
  limit?: number;
  period?: 'hour' | 'day' | 'month' | 'year';
  scope?: string[];
  condition?: string;
  message?: string;
}

interface LicensePermission {
  type: 'read' | 'export' | 'api_access' | 'bulk_operations' | 'advanced_analytics' | 'redistribution';
  scope: string[];
  conditions?: string[];
}

interface LicenseObligation {
  type: 'attribution' | 'notice' | 'audit_trail' | 'reporting' | 'data_retention';
  description: string;
  frequency?: 'immediate' | 'daily' | 'monthly' | 'quarterly' | 'annual';
  automated: boolean;
}

interface UsageRecord {
  tenantId: string;
  operationType: string;
  timestamp: Date;
  volume: number;
  dataTypes: string[];
  destination?: string;
  metadata: Record<string, any>;
}

interface LicenseCheck {
  allowed: boolean;
  restrictions: string[];
  obligations: LicenseObligation[];
  usage: {
    current: number;
    limit: number;
    period: string;
    resetTime?: Date;
  };
  licenseInfo: {
    type: string;
    tier: string;
    expiryDate?: Date;
  };
}

interface ComplianceViolation {
  id: string;
  tenantId: string;
  violationType: 'license_exceeded' | 'unauthorized_export' | 'geographic_restriction' | 'commercial_misuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export class LicensingEnforcementEngine {
  private db: Pool;
  private redis: Redis;
  private licenses: Map<string, LicenseDefinition>;
  private usageCache: Map<string, Map<string, number>>;

  // Default license limits
  private static readonly DEFAULT_LIMITS = {
    basic: {
      api_calls_per_hour: 1000,
      export_records_per_day: 10000,
      bulk_operations_per_month: 100
    },
    professional: {
      api_calls_per_hour: 10000,
      export_records_per_day: 100000,
      bulk_operations_per_month: 1000
    },
    enterprise: {
      api_calls_per_hour: 100000,
      export_records_per_day: 1000000,
      bulk_operations_per_month: 10000
    },
    unlimited: {
      api_calls_per_hour: -1, // No limit
      export_records_per_day: -1,
      bulk_operations_per_month: -1
    }
  };

  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.redis = redis;
    this.licenses = new Map();
    this.usageCache = new Map();

    this.loadLicenses();
    this.startUsageMonitoring();
  }

  /**
   * Check if operation is allowed under current license
   */
  async checkLicense(
    tenantId: string,
    operation: {
      type: 'api_call' | 'export' | 'bulk_operation' | 'analytics';
      volume?: number;
      dataTypes?: string[];
      destination?: string;
      commercial?: boolean;
    }
  ): Promise<LicenseCheck> {
    try {
      const license = await this.getLicenseForTenant(tenantId);

      if (!license) {
        return {
          allowed: false,
          restrictions: ['No valid license found'],
          obligations: [],
          usage: { current: 0, limit: 0, period: 'unknown' },
          licenseInfo: { type: 'none', tier: 'none' }
        };
      }

      // Check if license is expired
      if (license.expiryDate && license.expiryDate < new Date()) {
        return {
          allowed: false,
          restrictions: ['License expired'],
          obligations: [],
          usage: { current: 0, limit: 0, period: 'expired' },
          licenseInfo: {
            type: license.type,
            tier: license.tier,
            expiryDate: license.expiryDate
          }
        };
      }

      // Check restrictions
      const restrictionCheck = await this.checkRestrictions(license, operation);
      if (!restrictionCheck.allowed) {
        return restrictionCheck;
      }

      // Check usage limits
      const usageCheck = await this.checkUsageLimits(license, operation);
      if (!usageCheck.allowed) {
        return usageCheck;
      }

      // Get applicable obligations
      const obligations = this.getApplicableObligations(license, operation);

      return {
        allowed: true,
        restrictions: [],
        obligations,
        usage: usageCheck.usage,
        licenseInfo: {
          type: license.type,
          tier: license.tier,
          expiryDate: license.expiryDate
        }
      };

    } catch (error) {
      logger.error('License check failed:', error);

      // Fail secure - deny by default
      return {
        allowed: false,
        restrictions: ['License check failed'],
        obligations: [],
        usage: { current: 0, limit: 0, period: 'error' },
        licenseInfo: { type: 'error', tier: 'error' }
      };
    }
  }

  /**
   * Record usage for license compliance tracking
   */
  async recordUsage(
    tenantId: string,
    operation: {
      type: string;
      volume: number;
      dataTypes?: string[];
      destination?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const usageRecord: UsageRecord = {
        tenantId,
        operationType: operation.type,
        timestamp: new Date(),
        volume: operation.volume,
        dataTypes: operation.dataTypes || [],
        destination: operation.destination,
        metadata: operation.metadata || {}
      };

      // Store in database for audit
      await this.db.query(`
        INSERT INTO license_usage_log (
          tenant_id,
          operation_type,
          timestamp,
          volume,
          data_types,
          destination,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        usageRecord.tenantId,
        usageRecord.operationType,
        usageRecord.timestamp,
        usageRecord.volume,
        JSON.stringify(usageRecord.dataTypes),
        usageRecord.destination,
        JSON.stringify(usageRecord.metadata)
      ]);

      // Update Redis counters for real-time tracking
      await this.updateUsageCounters(tenantId, operation);

      // Check for violations
      await this.checkForViolations(tenantId, operation);

    } catch (error) {
      logger.error('Failed to record usage:', error);
    }
  }

  /**
   * Get current usage statistics for tenant
   */
  async getUsageStats(
    tenantId: string,
    period: 'hour' | 'day' | 'month' | 'year' = 'month'
  ): Promise<{
    apiCalls: number;
    exports: number;
    bulkOperations: number;
    dataVolume: number;
    limits: Record<string, number>;
    utilizationPercent: Record<string, number>;
  }> {
    try {
      const license = await this.getLicenseForTenant(tenantId);
      const limits = this.getLimitsForLicense(license);

      // Get usage from Redis
      const [apiCalls, exports, bulkOps, dataVolume] = await Promise.all([
        this.getUsageCounter(tenantId, 'api_calls', period),
        this.getUsageCounter(tenantId, 'exports', period),
        this.getUsageCounter(tenantId, 'bulk_operations', period),
        this.getUsageCounter(tenantId, 'data_volume', period)
      ]);

      const utilizationPercent = {
        apiCalls: limits.api_calls_per_hour > 0 ? (apiCalls / limits.api_calls_per_hour) * 100 : 0,
        exports: limits.export_records_per_day > 0 ? (exports / limits.export_records_per_day) * 100 : 0,
        bulkOperations: limits.bulk_operations_per_month > 0 ? (bulkOps / limits.bulk_operations_per_month) * 100 : 0
      };

      return {
        apiCalls,
        exports,
        bulkOperations: bulkOps,
        dataVolume,
        limits,
        utilizationPercent
      };

    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      return {
        apiCalls: 0,
        exports: 0,
        bulkOperations: 0,
        dataVolume: 0,
        limits: {},
        utilizationPercent: {}
      };
    }
  }

  /**
   * Generate license compliance report
   */
  async generateComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    license: LicenseDefinition;
    usage: UsageRecord[];
    violations: ComplianceViolation[];
    compliance: {
      overallScore: number;
      restrictions: Array<{ type: string; compliant: boolean; details: string }>;
      obligations: Array<{ type: string; fulfilled: boolean; details: string }>;
    };
  }> {
    try {
      const license = await this.getLicenseForTenant(tenantId);

      if (!license) {
        throw new Error('No license found for tenant');
      }

      // Get usage records
      const usageResult = await this.db.query(`
        SELECT *
        FROM license_usage_log
        WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
        ORDER BY timestamp DESC
      `, [tenantId, startDate, endDate]);

      const usage: UsageRecord[] = usageResult.rows.map(row => ({
        tenantId: row.tenant_id,
        operationType: row.operation_type,
        timestamp: row.timestamp,
        volume: row.volume,
        dataTypes: JSON.parse(row.data_types || '[]'),
        destination: row.destination,
        metadata: JSON.parse(row.metadata || '{}')
      }));

      // Get violations
      const violationsResult = await this.db.query(`
        SELECT *
        FROM compliance_violations
        WHERE tenant_id = $1 AND detected_at BETWEEN $2 AND $3
        ORDER BY detected_at DESC
      `, [tenantId, startDate, endDate]);

      const violations: ComplianceViolation[] = violationsResult.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        violationType: row.violation_type,
        severity: row.severity,
        description: row.description,
        detectedAt: row.detected_at,
        resolvedAt: row.resolved_at,
        metadata: JSON.parse(row.metadata || '{}')
      }));

      // Assess compliance
      const compliance = await this.assessCompliance(license, usage, violations);

      return {
        license,
        usage,
        violations,
        compliance
      };

    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Check license restrictions
   */
  private async checkRestrictions(
    license: LicenseDefinition,
    operation: any
  ): Promise<LicenseCheck> {
    const restrictions: string[] = [];

    for (const restriction of license.restrictions) {
      switch (restriction.type) {
        case 'commercial_use':
          if (operation.commercial && !this.hasPermission(license, 'commercial_use')) {
            restrictions.push('Commercial use not permitted under current license');
          }
          break;

        case 'data_types':
          if (operation.dataTypes && restriction.scope) {
            const restrictedTypes = operation.dataTypes.filter(type =>
              restriction.scope!.includes(type)
            );
            if (restrictedTypes.length > 0) {
              restrictions.push(`Access to data types ${restrictedTypes.join(', ')} is restricted`);
            }
          }
          break;

        case 'geographic':
          if (operation.destination && restriction.scope) {
            const isRestricted = restriction.scope.some(region =>
              operation.destination?.includes(region)
            );
            if (isRestricted) {
              restrictions.push('Geographic restrictions apply to this destination');
            }
          }
          break;

        case 'redistribution':
          if (operation.type === 'export' && operation.destination === 'external') {
            restrictions.push('Data redistribution not permitted under current license');
          }
          break;
      }
    }

    if (restrictions.length > 0) {
      return {
        allowed: false,
        restrictions,
        obligations: [],
        usage: { current: 0, limit: 0, period: 'restricted' },
        licenseInfo: { type: license.type, tier: license.tier }
      };
    }

    return {
      allowed: true,
      restrictions: [],
      obligations: [],
      usage: { current: 0, limit: 0, period: 'ok' },
      licenseInfo: { type: license.type, tier: license.tier }
    };
  }

  /**
   * Check usage limits
   */
  private async checkUsageLimits(
    license: LicenseDefinition,
    operation: any
  ): Promise<LicenseCheck> {
    const limits = this.getLimitsForLicense(license);

    // Check relevant limits based on operation type
    for (const restriction of license.restrictions) {
      if (restriction.type === 'api_calls' && operation.type === 'api_call') {
        const current = await this.getUsageCounter(license.tenantId, 'api_calls', restriction.period || 'hour');
        const limit = restriction.limit || limits.api_calls_per_hour;

        if (limit > 0 && current >= limit) {
          return {
            allowed: false,
            restrictions: [`API call limit exceeded (${current}/${limit} per ${restriction.period || 'hour'})`],
            obligations: [],
            usage: {
              current,
              limit,
              period: restriction.period || 'hour',
              resetTime: this.getResetTime(restriction.period || 'hour')
            },
            licenseInfo: { type: license.type, tier: license.tier }
          };
        }
      }

      if (restriction.type === 'export_volume' && operation.type === 'export') {
        const current = await this.getUsageCounter(license.tenantId, 'exports', restriction.period || 'day');
        const limit = restriction.limit || limits.export_records_per_day;

        if (limit > 0 && (current + (operation.volume || 1)) > limit) {
          return {
            allowed: false,
            restrictions: [`Export limit would be exceeded (${current + (operation.volume || 1)}/${limit} per ${restriction.period || 'day'})`],
            obligations: [],
            usage: {
              current,
              limit,
              period: restriction.period || 'day',
              resetTime: this.getResetTime(restriction.period || 'day')
            },
            licenseInfo: { type: license.type, tier: license.tier }
          };
        }
      }
    }

    return {
      allowed: true,
      restrictions: [],
      obligations: [],
      usage: { current: 0, limit: 0, period: 'ok' },
      licenseInfo: { type: license.type, tier: license.tier }
    };
  }

  /**
   * Get applicable obligations for operation
   */
  private getApplicableObligations(
    license: LicenseDefinition,
    operation: any
  ): LicenseObligation[] {
    return license.obligations.filter(obligation => {
      switch (obligation.type) {
        case 'attribution':
          return operation.type === 'export';
        case 'audit_trail':
          return true; // Always applicable
        case 'reporting':
          return operation.volume && operation.volume > 1000;
        default:
          return false;
      }
    });
  }

  /**
   * Helper methods
   */
  private async getLicenseForTenant(tenantId: string): Promise<LicenseDefinition | null> {
    return Array.from(this.licenses.values()).find(license => license.tenantId === tenantId) || null;
  }

  private hasPermission(license: LicenseDefinition, permission: string): boolean {
    return license.permissions.some(p => p.type === permission || p.scope.includes(permission));
  }

  private getLimitsForLicense(license: LicenseDefinition | null): any {
    if (!license) return LicensingEnforcementEngine.DEFAULT_LIMITS.basic;
    return LicensingEnforcementEngine.DEFAULT_LIMITS[license.tier] || LicensingEnforcementEngine.DEFAULT_LIMITS.basic;
  }

  private async getUsageCounter(tenantId: string, metric: string, period: string): Promise<number> {
    try {
      const key = this.getUsageKey(tenantId, metric, period);
      const value = await this.redis.get(key);
      return value ? parseInt(value) : 0;
    } catch (error) {
      logger.error('Failed to get usage counter:', error);
      return 0;
    }
  }

  private async updateUsageCounters(tenantId: string, operation: any): Promise<void> {
    const pipeline = this.redis.pipeline();

    // Update counters for different periods
    const periods = ['hour', 'day', 'month', 'year'];
    const metrics = this.getMetricsForOperation(operation);

    for (const period of periods) {
      for (const [metric, value] of Object.entries(metrics)) {
        const key = this.getUsageKey(tenantId, metric, period);
        pipeline.incrby(key, value as number);
        pipeline.expire(key, this.getTTLForPeriod(period));
      }
    }

    await pipeline.exec();
  }

  private getUsageKey(tenantId: string, metric: string, period: string): string {
    const now = new Date();
    const timeKey = this.getTimeKeyForPeriod(now, period);
    return `license_usage:${tenantId}:${metric}:${period}:${timeKey}`;
  }

  private getTimeKeyForPeriod(date: Date, period: string): string {
    switch (period) {
      case 'hour':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      case 'day':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      case 'month':
        return `${date.getFullYear()}-${date.getMonth()}`;
      case 'year':
        return `${date.getFullYear()}`;
      default:
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }
  }

  private getTTLForPeriod(period: string): number {
    switch (period) {
      case 'hour': return 3600 * 25; // 25 hours
      case 'day': return 86400 * 32; // 32 days
      case 'month': return 86400 * 366; // 366 days
      case 'year': return 86400 * 732; // 2 years
      default: return 86400; // 1 day
    }
  }

  private getResetTime(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'hour':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      case 'year':
        return new Date(now.getFullYear() + 1, 0, 1);
      default:
        return new Date(now.getTime() + 86400000); // 1 day
    }
  }

  private getMetricsForOperation(operation: any): Record<string, number> {
    const metrics: Record<string, number> = {};

    switch (operation.type) {
      case 'api_call':
        metrics.api_calls = 1;
        break;
      case 'export':
        metrics.exports = 1;
        metrics.data_volume = operation.volume || 1;
        break;
      case 'bulk_operation':
        metrics.bulk_operations = 1;
        break;
    }

    return metrics;
  }

  private async checkForViolations(tenantId: string, operation: any): Promise<void> {
    // Implementation for violation detection
    // This would check for patterns indicating license violations
  }

  private async assessCompliance(
    license: LicenseDefinition,
    usage: UsageRecord[],
    violations: ComplianceViolation[]
  ): Promise<any> {
    // Implementation for compliance assessment
    return {
      overallScore: violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 10),
      restrictions: [],
      obligations: []
    };
  }

  private async loadLicenses(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT *
        FROM tenant_licenses
        WHERE effective_date <= NOW() AND (expiry_date IS NULL OR expiry_date > NOW())
      `);

      this.licenses.clear();

      for (const row of result.rows) {
        const license: LicenseDefinition = {
          id: row.id,
          name: row.name,
          version: row.version,
          type: row.type,
          tier: row.tier,
          restrictions: JSON.parse(row.restrictions || '[]'),
          permissions: JSON.parse(row.permissions || '[]'),
          obligations: JSON.parse(row.obligations || '[]'),
          effectiveDate: row.effective_date,
          expiryDate: row.expiry_date,
          tenantId: row.tenant_id,
          metadata: JSON.parse(row.metadata || '{}')
        };

        this.licenses.set(license.id, license);
      }

      logger.info(`Loaded ${this.licenses.size} license definitions`);

    } catch (error) {
      logger.error('Failed to load licenses:', error);
    }
  }

  private startUsageMonitoring(): void {
    // Start periodic usage monitoring
    setInterval(async () => {
      try {
        await this.monitorUsagePatterns();
      } catch (error) {
        logger.error('Usage monitoring failed:', error);
      }
    }, 300000); // Every 5 minutes
  }

  private async monitorUsagePatterns(): Promise<void> {
    // Implementation for usage pattern monitoring
    // This would detect unusual usage patterns that might indicate violations
  }
}

export default LicensingEnforcementEngine;