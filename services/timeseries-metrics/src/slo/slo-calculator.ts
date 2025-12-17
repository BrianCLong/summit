/**
 * SLO Calculator Service
 *
 * Calculates SLO compliance, error budgets, and burn rates
 * from time-series metrics data.
 */

import { Logger } from 'winston';
import { QueryEngine, QueryOptions, QueryResult } from '../query/query-engine.js';

// ============================================================================
// SLO DEFINITIONS
// ============================================================================

/**
 * SLO types
 */
export enum SLOType {
  /** Availability SLO (success rate) */
  AVAILABILITY = 'availability',
  /** Latency SLO (response time percentile) */
  LATENCY = 'latency',
  /** Throughput SLO (request rate) */
  THROUGHPUT = 'throughput',
  /** Error rate SLO */
  ERROR_RATE = 'error_rate',
  /** Custom metric threshold */
  CUSTOM = 'custom',
}

/**
 * SLO window type
 */
export enum SLOWindowType {
  ROLLING = 'rolling',
  CALENDAR = 'calendar',
}

/**
 * SLO definition
 */
export interface SLODefinition {
  /** Unique SLO ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** SLO type */
  type: SLOType;
  /** Service this SLO applies to */
  service: string;
  /** Target value (e.g., 99.9 for 99.9% availability) */
  target: number;
  /** Window type */
  windowType: SLOWindowType;
  /** Window duration (e.g., '30d') */
  windowDuration: string;
  /** SLI query (PromQL-like) */
  sliQuery: {
    /** Good events query */
    good: string;
    /** Total events query */
    total: string;
  };
  /** Alert thresholds for burn rate */
  burnRateAlerts?: BurnRateAlert[];
  /** Labels to group by */
  groupBy?: string[];
  /** Tenant ID */
  tenantId: string;
}

/**
 * Burn rate alert configuration
 */
export interface BurnRateAlert {
  /** Alert severity */
  severity: 'critical' | 'warning' | 'info';
  /** Short window (e.g., '5m') */
  shortWindow: string;
  /** Long window (e.g., '1h') */
  longWindow: string;
  /** Burn rate threshold */
  burnRateThreshold: number;
}

/**
 * SLO status result
 */
export interface SLOStatus {
  sloId: string;
  sloName: string;
  service: string;
  /** Current SLI value (0-100) */
  currentSLI: number;
  /** Target SLI (0-100) */
  targetSLI: number;
  /** Whether SLO is currently met */
  isMet: boolean;
  /** Error budget remaining (0-100) */
  errorBudgetRemaining: number;
  /** Error budget consumed (0-100) */
  errorBudgetConsumed: number;
  /** Current burn rate (1.0 = normal, >1.0 = burning faster) */
  burnRate: number;
  /** Time until budget exhaustion at current rate (ms) */
  timeToExhaustion: number | null;
  /** Window start time */
  windowStart: number;
  /** Window end time */
  windowEnd: number;
  /** Good events count */
  goodEvents: number;
  /** Total events count */
  totalEvents: number;
  /** Bad events count */
  badEvents: number;
  /** Burn rate alerts triggered */
  triggeredAlerts: TriggeredAlert[];
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Triggered alert
 */
export interface TriggeredAlert {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  burnRate: number;
  shortWindowBurnRate: number;
  longWindowBurnRate: number;
}

/**
 * SLO history point
 */
export interface SLOHistoryPoint {
  timestamp: number;
  sli: number;
  errorBudgetRemaining: number;
  burnRate: number;
}

// ============================================================================
// SLO CALCULATOR
// ============================================================================

export class SLOCalculator {
  private queryEngine: QueryEngine;
  private logger: Logger;
  private sloDefinitions: Map<string, SLODefinition>;

  constructor(queryEngine: QueryEngine, logger: Logger) {
    this.queryEngine = queryEngine;
    this.logger = logger;
    this.sloDefinitions = new Map();
  }

  /**
   * Register an SLO definition
   */
  registerSLO(definition: SLODefinition): void {
    this.sloDefinitions.set(definition.id, definition);
    this.logger.info('SLO registered', {
      id: definition.id,
      name: definition.name,
      target: definition.target,
    });
  }

  /**
   * Unregister an SLO
   */
  unregisterSLO(sloId: string): void {
    this.sloDefinitions.delete(sloId);
  }

  /**
   * Get all registered SLOs
   */
  getRegisteredSLOs(tenantId?: string): SLODefinition[] {
    const slos = Array.from(this.sloDefinitions.values());
    if (tenantId) {
      return slos.filter((s) => s.tenantId === tenantId);
    }
    return slos;
  }

  /**
   * Calculate SLO status
   */
  async calculateStatus(sloId: string): Promise<SLOStatus> {
    const definition = this.sloDefinitions.get(sloId);
    if (!definition) {
      throw new Error(`SLO not found: ${sloId}`);
    }

    const now = Date.now();
    const windowMs = this.parseDuration(definition.windowDuration);
    const windowStart = this.calculateWindowStart(now, definition);
    const windowEnd = now;

    const queryOptions: QueryOptions = {
      tenantId: definition.tenantId,
      timeout: 30000,
    };

    // Query good events
    const goodResult = await this.queryEngine.rangeQuery(
      definition.sliQuery.good,
      windowStart,
      windowEnd,
      60000, // 1 minute step
      queryOptions,
    );

    // Query total events
    const totalResult = await this.queryEngine.rangeQuery(
      definition.sliQuery.total,
      windowStart,
      windowEnd,
      60000,
      queryOptions,
    );

    // Calculate totals
    const goodEvents = this.sumQueryResult(goodResult);
    const totalEvents = this.sumQueryResult(totalResult);
    const badEvents = totalEvents - goodEvents;

    // Calculate SLI
    const currentSLI = totalEvents > 0 ? (goodEvents / totalEvents) * 100 : 100;

    // Calculate error budget
    const targetSLI = definition.target;
    const errorBudgetTotal = 100 - targetSLI; // e.g., 0.1% for 99.9% SLO
    const errorRate = 100 - currentSLI;
    const errorBudgetConsumed =
      errorBudgetTotal > 0 ? (errorRate / errorBudgetTotal) * 100 : 0;
    const errorBudgetRemaining = Math.max(0, 100 - errorBudgetConsumed);

    // Calculate burn rate
    const burnRate = this.calculateBurnRate(
      currentSLI,
      targetSLI,
      windowMs,
      now - windowStart,
    );

    // Calculate time to exhaustion
    const timeToExhaustion = this.calculateTimeToExhaustion(
      errorBudgetRemaining,
      burnRate,
      windowMs,
    );

    // Check burn rate alerts
    const triggeredAlerts = await this.checkBurnRateAlerts(
      definition,
      queryOptions,
      now,
    );

    return {
      sloId: definition.id,
      sloName: definition.name,
      service: definition.service,
      currentSLI,
      targetSLI,
      isMet: currentSLI >= targetSLI,
      errorBudgetRemaining,
      errorBudgetConsumed: Math.min(100, errorBudgetConsumed),
      burnRate,
      timeToExhaustion,
      windowStart,
      windowEnd,
      goodEvents,
      totalEvents,
      badEvents,
      triggeredAlerts,
      lastUpdated: now,
    };
  }

  /**
   * Calculate SLO history
   */
  async calculateHistory(
    sloId: string,
    start: number,
    end: number,
    step: number,
  ): Promise<SLOHistoryPoint[]> {
    const definition = this.sloDefinitions.get(sloId);
    if (!definition) {
      throw new Error(`SLO not found: ${sloId}`);
    }

    const queryOptions: QueryOptions = {
      tenantId: definition.tenantId,
      timeout: 60000,
    };

    const windowMs = this.parseDuration(definition.windowDuration);
    const history: SLOHistoryPoint[] = [];

    // Query data for the entire range
    const goodResult = await this.queryEngine.rangeQuery(
      definition.sliQuery.good,
      start - windowMs,
      end,
      step,
      queryOptions,
    );

    const totalResult = await this.queryEngine.rangeQuery(
      definition.sliQuery.total,
      start - windowMs,
      end,
      step,
      queryOptions,
    );

    // Calculate SLI at each point
    for (let ts = start; ts <= end; ts += step) {
      const windowStart = ts - windowMs;

      // Sum events in window
      const goodEvents = this.sumInWindow(goodResult, windowStart, ts);
      const totalEvents = this.sumInWindow(totalResult, windowStart, ts);

      const sli = totalEvents > 0 ? (goodEvents / totalEvents) * 100 : 100;
      const errorBudgetTotal = 100 - definition.target;
      const errorRate = 100 - sli;
      const errorBudgetConsumed =
        errorBudgetTotal > 0 ? (errorRate / errorBudgetTotal) * 100 : 0;
      const errorBudgetRemaining = Math.max(0, 100 - errorBudgetConsumed);
      const burnRate = this.calculateBurnRate(
        sli,
        definition.target,
        windowMs,
        ts - windowStart,
      );

      history.push({
        timestamp: ts,
        sli,
        errorBudgetRemaining,
        burnRate,
      });
    }

    return history;
  }

  /**
   * Calculate burn rate
   */
  private calculateBurnRate(
    currentSLI: number,
    targetSLI: number,
    windowMs: number,
    elapsedMs: number,
  ): number {
    if (elapsedMs === 0) return 0;

    const errorBudgetTotal = 100 - targetSLI;
    const currentErrorRate = 100 - currentSLI;

    if (errorBudgetTotal === 0) return 0;

    // Burn rate = (error rate / error budget) * (window duration / elapsed time)
    const expectedBurnRate = elapsedMs / windowMs;
    const actualBurnRate = currentErrorRate / errorBudgetTotal;

    return expectedBurnRate > 0 ? actualBurnRate / expectedBurnRate : 0;
  }

  /**
   * Calculate time to error budget exhaustion
   */
  private calculateTimeToExhaustion(
    errorBudgetRemaining: number,
    burnRate: number,
    windowMs: number,
  ): number | null {
    if (burnRate <= 1 || errorBudgetRemaining <= 0) {
      return null; // Not burning or already exhausted
    }

    // Time = remaining budget / (burn rate - 1) * window
    const remainingFraction = errorBudgetRemaining / 100;
    const excessBurnRate = burnRate - 1;

    return (remainingFraction / excessBurnRate) * windowMs;
  }

  /**
   * Check burn rate alerts
   */
  private async checkBurnRateAlerts(
    definition: SLODefinition,
    queryOptions: QueryOptions,
    now: number,
  ): Promise<TriggeredAlert[]> {
    const alerts: TriggeredAlert[] = [];

    if (!definition.burnRateAlerts) return alerts;

    for (const alertConfig of definition.burnRateAlerts) {
      const shortWindowMs = this.parseDuration(alertConfig.shortWindow);
      const longWindowMs = this.parseDuration(alertConfig.longWindow);

      // Calculate burn rates for both windows
      const shortBurnRate = await this.calculateWindowBurnRate(
        definition,
        now - shortWindowMs,
        now,
        queryOptions,
      );

      const longBurnRate = await this.calculateWindowBurnRate(
        definition,
        now - longWindowMs,
        now,
        queryOptions,
      );

      // Multi-window alert: both windows must exceed threshold
      if (
        shortBurnRate >= alertConfig.burnRateThreshold &&
        longBurnRate >= alertConfig.burnRateThreshold
      ) {
        alerts.push({
          severity: alertConfig.severity,
          message: `${alertConfig.severity.toUpperCase()}: SLO "${definition.name}" burn rate ${shortBurnRate.toFixed(2)}x (${alertConfig.shortWindow}) / ${longBurnRate.toFixed(2)}x (${alertConfig.longWindow}) exceeds threshold ${alertConfig.burnRateThreshold}x`,
          burnRate: Math.max(shortBurnRate, longBurnRate),
          shortWindowBurnRate: shortBurnRate,
          longWindowBurnRate: longBurnRate,
        });
      }
    }

    return alerts;
  }

  /**
   * Calculate burn rate for a specific window
   */
  private async calculateWindowBurnRate(
    definition: SLODefinition,
    start: number,
    end: number,
    queryOptions: QueryOptions,
  ): Promise<number> {
    const goodResult = await this.queryEngine.rangeQuery(
      definition.sliQuery.good,
      start,
      end,
      60000,
      queryOptions,
    );

    const totalResult = await this.queryEngine.rangeQuery(
      definition.sliQuery.total,
      start,
      end,
      60000,
      queryOptions,
    );

    const goodEvents = this.sumQueryResult(goodResult);
    const totalEvents = this.sumQueryResult(totalResult);
    const currentSLI = totalEvents > 0 ? (goodEvents / totalEvents) * 100 : 100;

    const windowMs = this.parseDuration(definition.windowDuration);
    return this.calculateBurnRate(currentSLI, definition.target, windowMs, end - start);
  }

  /**
   * Sum all values in query result
   */
  private sumQueryResult(result: QueryResult): number {
    let sum = 0;
    for (const series of result.data) {
      if (series.values) {
        for (const [, value] of series.values) {
          sum += parseFloat(value);
        }
      } else if (series.value) {
        sum += parseFloat(series.value[1]);
      }
    }
    return sum;
  }

  /**
   * Sum values in a time window
   */
  private sumInWindow(
    result: QueryResult,
    windowStart: number,
    windowEnd: number,
  ): number {
    let sum = 0;
    for (const series of result.data) {
      if (series.values) {
        for (const [ts, value] of series.values) {
          const timestamp = ts * 1000;
          if (timestamp >= windowStart && timestamp <= windowEnd) {
            sum += parseFloat(value);
          }
        }
      }
    }
    return sum;
  }

  /**
   * Calculate window start based on window type
   */
  private calculateWindowStart(now: number, definition: SLODefinition): number {
    const windowMs = this.parseDuration(definition.windowDuration);

    if (definition.windowType === SLOWindowType.ROLLING) {
      return now - windowMs;
    }

    // Calendar window - align to start of period
    const date = new Date(now);
    const durationMatch = definition.windowDuration.match(/^(\d+)([dmwy])$/);

    if (!durationMatch) return now - windowMs;

    const [, , unit] = durationMatch;

    switch (unit) {
      case 'd': // Align to start of day
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      case 'w': // Align to start of week (Monday)
        date.setHours(0, 0, 0, 0);
        const day = date.getDay();
        const diff = day === 0 ? 6 : day - 1;
        date.setDate(date.getDate() - diff);
        return date.getTime();
      case 'm': // Align to start of month
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      case 'y': // Align to start of year
        date.setMonth(0, 1);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      default:
        return now - windowMs;
    }
  }

  /**
   * Parse duration string to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(s|m|h|d|w|y)$/);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      y: 365 * 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}

// ============================================================================
// PREDEFINED SLO TEMPLATES
// ============================================================================

/**
 * Create availability SLO template
 */
export function createAvailabilitySLO(
  service: string,
  target: number,
  tenantId: string,
): Partial<SLODefinition> {
  return {
    type: SLOType.AVAILABILITY,
    service,
    target,
    tenantId,
    windowType: SLOWindowType.ROLLING,
    windowDuration: '30d',
    sliQuery: {
      good: `sum(rate(http_requests_total{service="${service}", status!~"5.."}[5m]))`,
      total: `sum(rate(http_requests_total{service="${service}"}[5m]))`,
    },
    burnRateAlerts: [
      {
        severity: 'critical',
        shortWindow: '5m',
        longWindow: '1h',
        burnRateThreshold: 14.4, // Consumes 2% of monthly budget in 1 hour
      },
      {
        severity: 'critical',
        shortWindow: '30m',
        longWindow: '6h',
        burnRateThreshold: 6, // Consumes 5% of monthly budget in 6 hours
      },
      {
        severity: 'warning',
        shortWindow: '2h',
        longWindow: '1d',
        burnRateThreshold: 3, // Consumes 10% of monthly budget in 1 day
      },
      {
        severity: 'warning',
        shortWindow: '6h',
        longWindow: '3d',
        burnRateThreshold: 1, // On track to exhaust budget
      },
    ],
  };
}

/**
 * Create latency SLO template
 */
export function createLatencySLO(
  service: string,
  percentile: number,
  thresholdMs: number,
  target: number,
  tenantId: string,
): Partial<SLODefinition> {
  return {
    type: SLOType.LATENCY,
    service,
    target,
    tenantId,
    windowType: SLOWindowType.ROLLING,
    windowDuration: '30d',
    sliQuery: {
      good: `sum(rate(http_request_duration_seconds_bucket{service="${service}", le="${thresholdMs / 1000}"}[5m]))`,
      total: `sum(rate(http_request_duration_seconds_count{service="${service}"}[5m]))`,
    },
    burnRateAlerts: [
      {
        severity: 'critical',
        shortWindow: '5m',
        longWindow: '1h',
        burnRateThreshold: 14.4,
      },
      {
        severity: 'warning',
        shortWindow: '2h',
        longWindow: '1d',
        burnRateThreshold: 3,
      },
    ],
  };
}
