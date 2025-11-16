// server/src/conductor/learn/exploration-guardrails.ts

import Redis from 'ioredis';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface ExplorationConfig {
  tenantId: string;
  expertType: string;
  baseExplorationRate: number; // 0.01 = 1%
  maxExplorationRate: number; // 0.08 = 8%
  regretThreshold: number; // 0.15 = 15%
  errorRateThreshold: number; // 0.02 = 2%
  coolingPeriodMs: number; // 300000 = 5 minutes
}

interface ExplorationDecision {
  shouldExplore: boolean;
  explorationRate: number;
  adjustmentReason?: string;
  emergencyStop: boolean;
}

interface RegretMeasurement {
  instantRegret: number;
  cumulativeRegret: number;
  windowRegret: number;
  timestamp: number;
}

interface ExplorationState {
  currentRate: number;
  isEmergencyStop: boolean;
  lastAdjustment: number;
  consecutiveHighRegret: number;
  totalExplorationCount: number;
  successfulExplorations: number;
}

export class ExplorationGuardrails {
  private redis: Redis;
  private configs: Map<string, ExplorationConfig>;
  private states: Map<string, ExplorationState>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.configs = new Map();
    this.states = new Map();
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    await this.loadConfigurations();
  }

  /**
   * Decide whether to explore for a given tenant/expert combination
   */
  async shouldExplore(
    tenantId: string,
    expertType: string,
    currentRegret?: number,
  ): Promise<ExplorationDecision> {
    const configKey = `${tenantId}:${expertType}`;
    const config = this.configs.get(configKey);

    if (!config) {
      // Default safe configuration
      return {
        shouldExplore: Math.random() < 0.01, // 1% default
        explorationRate: 0.01,
        emergencyStop: false,
      };
    }

    const state = await this.getExplorationState(configKey);

    // Check emergency stop conditions
    if (state.isEmergencyStop) {
      const coolingPeriodElapsed =
        Date.now() - state.lastAdjustment > config.coolingPeriodMs;

      if (!coolingPeriodElapsed) {
        return {
          shouldExplore: false,
          explorationRate: 0,
          adjustmentReason: 'emergency_stop_cooling',
          emergencyStop: true,
        };
      } else {
        // Try to resume with reduced rate
        state.isEmergencyStop = false;
        state.currentRate = Math.max(0.005, config.baseExplorationRate * 0.5);
        await this.saveExplorationState(configKey, state);
      }
    }

    // Get recent regret measurements
    const regretMeasurement = await this.getRegretMeasurement(
      tenantId,
      expertType,
    );

    // Check regret-based guardrails
    const regretCheck = await this.checkRegretGuardrails(
      config,
      state,
      regretMeasurement,
    );
    if (regretCheck.emergencyStop) {
      state.isEmergencyStop = true;
      state.lastAdjustment = Date.now();
      await this.saveExplorationState(configKey, state);

      // Alert on-call
      await this.alertOnCall('high_regret', {
        tenantId,
        expertType,
        instantRegret: regretMeasurement.instantRegret,
        threshold: config.regretThreshold,
      });

      return {
        shouldExplore: false,
        explorationRate: 0,
        adjustmentReason: 'regret_emergency_stop',
        emergencyStop: true,
      };
    }

    // Check error rate guardrails
    const errorRate = await this.getErrorRate(tenantId, expertType);
    if (errorRate > config.errorRateThreshold) {
      const reduction = Math.min(
        0.5,
        errorRate / config.errorRateThreshold - 1,
      );
      state.currentRate = Math.max(0.005, state.currentRate * (1 - reduction));
      state.lastAdjustment = Date.now();

      await this.saveExplorationState(configKey, state);

      logger.warn('Exploration rate reduced due to error rate', {
        tenantId,
        expertType,
        errorRate,
        newRate: state.currentRate,
        reduction,
      });
    }

    // Adaptive rate adjustment based on exploration success
    if (state.totalExplorationCount >= 100) {
      // Enough data to adapt
      const successRate =
        state.successfulExplorations / state.totalExplorationCount;

      if (successRate > 0.7 && state.currentRate < config.maxExplorationRate) {
        // Successful explorations - can increase rate
        state.currentRate = Math.min(
          config.maxExplorationRate,
          state.currentRate * 1.1,
        );
      } else if (successRate < 0.3) {
        // Poor exploration performance - decrease rate
        state.currentRate = Math.max(0.005, state.currentRate * 0.9);
      }
    }

    // Make exploration decision
    const shouldExplore = Math.random() < state.currentRate;

    // Record metrics
    prometheusConductorMetrics.recordOperationalMetric(
      'exploration_rate',
      state.currentRate,
      {
        tenant_id: tenantId,
        expert_type: expertType,
      },
    );

    prometheusConductorMetrics.recordOperationalEvent(
      'exploration_decision',
      shouldExplore,
      {
        tenant_id: tenantId,
        expert_type: expertType,
      },
    );

    if (regretMeasurement.instantRegret > 0) {
      prometheusConductorMetrics.recordOperationalMetric(
        'router_instant_regret',
        regretMeasurement.instantRegret,
        { tenant_id: tenantId, expert_type: expertType },
      );
    }

    return {
      shouldExplore,
      explorationRate: state.currentRate,
      emergencyStop: false,
    };
  }

  /**
   * Record exploration outcome
   */
  async recordExplorationOutcome(
    tenantId: string,
    expertType: string,
    success: boolean,
    regret: number,
  ): Promise<void> {
    const configKey = `${tenantId}:${expertType}`;
    const state = await this.getExplorationState(configKey);

    state.totalExplorationCount++;
    if (success) {
      state.successfulExplorations++;
    }

    await this.saveExplorationState(configKey, state);

    // Store regret measurement
    await this.storeRegretMeasurement(tenantId, expertType, regret);

    logger.debug('Exploration outcome recorded', {
      tenantId,
      expertType,
      success,
      regret,
      totalExplorations: state.totalExplorationCount,
    });
  }

  /**
   * Configure exploration settings for tenant/expert
   */
  async configureExploration(config: ExplorationConfig): Promise<void> {
    const configKey = `${config.tenantId}:${config.expertType}`;
    this.configs.set(configKey, config);

    // Persist to Redis
    await this.redis.hSet(
      'exploration_configs',
      configKey,
      JSON.stringify(config),
    );

    logger.info('Exploration configured', {
      tenantId: config.tenantId,
      expertType: config.expertType,
      baseRate: config.baseExplorationRate,
      maxRate: config.maxExplorationRate,
    });
  }

  private async loadConfigurations(): Promise<void> {
    try {
      const configs = await this.redis.hGetAll('exploration_configs');

      for (const [key, configStr] of Object.entries(configs)) {
        try {
          const config: ExplorationConfig = JSON.parse(configStr);
          this.configs.set(key, config);
        } catch (error) {
          logger.warn('Failed to parse exploration config', {
            key,
            error: error.message,
          });
        }
      }

      logger.info(`Loaded ${this.configs.size} exploration configurations`);
    } catch (error) {
      logger.error('Failed to load exploration configurations', {
        error: error.message,
      });
    }
  }

  private async getExplorationState(
    configKey: string,
  ): Promise<ExplorationState> {
    let state = this.states.get(configKey);

    if (!state) {
      // Try to load from Redis
      const stateStr = await this.redis.hGet('exploration_states', configKey);

      if (stateStr) {
        try {
          state = JSON.parse(stateStr);
        } catch (error) {
          logger.warn('Failed to parse exploration state', { configKey });
        }
      }

      // Default state
      if (!state) {
        const config = this.configs.get(configKey);
        state = {
          currentRate: config?.baseExplorationRate || 0.01,
          isEmergencyStop: false,
          lastAdjustment: 0,
          consecutiveHighRegret: 0,
          totalExplorationCount: 0,
          successfulExplorations: 0,
        };
      }

      this.states.set(configKey, state);
    }

    return state;
  }

  private async saveExplorationState(
    configKey: string,
    state: ExplorationState,
  ): Promise<void> {
    this.states.set(configKey, state);
    await this.redis.hSet(
      'exploration_states',
      configKey,
      JSON.stringify(state),
    );
  }

  private async getRegretMeasurement(
    tenantId: string,
    expertType: string,
  ): Promise<RegretMeasurement> {
    const key = `regret:${tenantId}:${expertType}`;

    // Get recent regret measurements (last 10 minutes)
    const measurements = await this.redis.zRangeByScore(
      key,
      Date.now() - 600000, // 10 minutes ago
      Date.now(),
      { WITHSCORES: true },
    );

    if (measurements.length === 0) {
      return {
        instantRegret: 0,
        cumulativeRegret: 0,
        windowRegret: 0,
        timestamp: Date.now(),
      };
    }

    const values = measurements
      .filter((_, i) => i % 2 === 0)
      .map((v) => parseFloat(v as string));
    const instantRegret = values[values.length - 1] || 0;
    const cumulativeRegret = values.reduce((sum, val) => sum + val, 0);
    const windowRegret =
      values.length > 0 ? cumulativeRegret / values.length : 0;

    return {
      instantRegret,
      cumulativeRegret,
      windowRegret,
      timestamp: Date.now(),
    };
  }

  private async storeRegretMeasurement(
    tenantId: string,
    expertType: string,
    regret: number,
  ): Promise<void> {
    const key = `regret:${tenantId}:${expertType}`;
    const now = Date.now();

    // Store with timestamp
    await this.redis.zAdd(key, { score: now, value: regret.toString() });

    // Keep only last hour of measurements
    await this.redis.zRemRangeByScore(key, '-inf', now - 3600000);
  }

  private async checkRegretGuardrails(
    config: ExplorationConfig,
    state: ExplorationState,
    regret: RegretMeasurement,
  ): Promise<{ emergencyStop: boolean; adjustmentNeeded: boolean }> {
    if (regret.instantRegret > config.regretThreshold) {
      state.consecutiveHighRegret++;

      // Emergency stop after 3 consecutive high regret measurements
      if (state.consecutiveHighRegret >= 3) {
        return { emergencyStop: true, adjustmentNeeded: false };
      }

      return { emergencyStop: false, adjustmentNeeded: true };
    } else {
      state.consecutiveHighRegret = 0;
      return { emergencyStop: false, adjustmentNeeded: false };
    }
  }

  private async getErrorRate(
    tenantId: string,
    expertType: string,
  ): Promise<number> {
    const key = `errors:${tenantId}:${expertType}`;

    // Get error count in last 5 minutes
    const errorCount = await this.redis.zCount(
      key,
      Date.now() - 300000,
      Date.now(),
    );

    // Get total request count
    const totalKey = `requests:${tenantId}:${expertType}`;
    const totalCount = await this.redis.zCount(
      totalKey,
      Date.now() - 300000,
      Date.now(),
    );

    return totalCount > 0 ? errorCount / totalCount : 0;
  }

  private async alertOnCall(alertType: string, context: any): Promise<void> {
    const alert = {
      type: 'exploration_guardrail_triggered',
      alertType,
      context,
      timestamp: new Date().toISOString(),
      severity: 'warning',
    };

    // Queue alert for on-call system
    await this.redis.lPush('oncall_alerts', JSON.stringify(alert));

    logger.warn('On-call alert triggered', { alertType, context });
  }

  /**
   * Get default exploration configuration
   */
  static getDefaultConfig(
    tenantId: string,
    expertType: string,
    tier: 'production' | 'pilot' = 'production',
  ): ExplorationConfig {
    const baseRates = {
      production: 0.02, // 2%
      pilot: 0.05, // 5%
    };

    const maxRates = {
      production: 0.05, // 5%
      pilot: 0.1, // 10%
    };

    return {
      tenantId,
      expertType,
      baseExplorationRate: baseRates[tier],
      maxExplorationRate: maxRates[tier],
      regretThreshold: 0.15, // 15%
      errorRateThreshold: 0.02, // 2%
      coolingPeriodMs: 300000, // 5 minutes
    };
  }
}
