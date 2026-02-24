import {
  FeatureFlagProvider,
  FlagContext,
  FlagEvaluation,
  FlagDefinition,
  FlagVariation,
  TargetingRule,
  Condition,
  EvaluationReason,
  PercentageRollout,
} from './types.js';
import { getPostgresPool } from '../db/postgres.js';
import logger from '../utils/logger.js';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export class PostgresProvider extends EventEmitter implements FeatureFlagProvider {
  name = 'postgres';
  private ready = false;
  private redis?: Redis;
  private pubsub?: Redis;
  private cache = new Map<string, FlagDefinition>();
  private lastUpdate = 0;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    try {
      // Connect to Redis for updates if configured
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.pubsub = new Redis(process.env.REDIS_URL);

        this.pubsub.subscribe('feature_flag_updates', (err: any) => {
          if (err) {
            logger.error('Failed to subscribe to feature_flag_updates', err);
          }
        });

        this.pubsub.on('message', (channel: any, message: any) => {
          if (channel === 'feature_flag_updates') {
            this.handleUpdate(message);
          }
        });
      }

      // Initial load
      await this.refreshCache();

      this.ready = true;
      logger.info('PostgresFeatureFlagProvider initialized');
    } catch (error: any) {
      logger.error('Failed to initialize PostgresFeatureFlagProvider', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.redis) await this.redis.quit();
    if (this.pubsub) await this.pubsub.quit();
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }

  private async handleUpdate(message: string) {
    try {
      // Refresh all for simplicity, or parse message for specific key
      await this.refreshCache();
      this.emit('update');
    } catch (error: any) {
      logger.error('Error handling flag update', error);
    }
  }

  private async refreshCache() {
    const pool = getPostgresPool();
    const result = await pool.query('SELECT * FROM feature_flags');

    this.cache.clear();
    for (const row of result.rows) {
      this.cache.set(row.key, this.mapRowToDefinition(row));
    }
    this.lastUpdate = Date.now();
  }

  private mapRowToDefinition(row: any): FlagDefinition {
    return {
      key: row.key,
      name: row.key, // fallback
      description: row.description,
      type: row.type,
      enabled: row.enabled,
      defaultValue: row.default_value,
      variations: row.variations || [],
      rules: row.rollout_rules || [], // DB column is rollout_rules, type expects rules
      rollout: undefined, // Simple rollout supported via rules
      metadata: { tenantId: row.tenant_id },
      createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    };
  }

  async getBooleanFlag(
    key: string,
    defaultValue: boolean,
    context: FlagContext,
  ): Promise<FlagEvaluation<boolean>> {
    return this.evaluate(key, defaultValue, context);
  }

  async getStringFlag(
    key: string,
    defaultValue: string,
    context: FlagContext,
  ): Promise<FlagEvaluation<string>> {
    return this.evaluate(key, defaultValue, context);
  }

  async getNumberFlag(
    key: string,
    defaultValue: number,
    context: FlagContext,
  ): Promise<FlagEvaluation<number>> {
    return this.evaluate(key, defaultValue, context);
  }

  async getJSONFlag<T = any>(
    key: string,
    defaultValue: T,
    context: FlagContext,
  ): Promise<FlagEvaluation<T>> {
    return this.evaluate(key, defaultValue, context);
  }

  private async evaluate<T>(
    key: string,
    defaultValue: T,
    context: FlagContext,
  ): Promise<FlagEvaluation<T>> {
    const flag = this.cache.get(key);

    if (!flag) {
      return {
        key,
        value: defaultValue,
        exists: false,
        reason: 'DEFAULT',
        timestamp: Date.now(),
      };
    }

    if (!flag.enabled) {
      return {
        key,
        value: defaultValue, // Or strict fallback? Usually if disabled we return default
        exists: true,
        reason: 'OFF',
        timestamp: Date.now(),
      };
    }

    // Tenant check if applicable
    if (flag.metadata?.tenantId && context.tenantId && flag.metadata.tenantId !== context.tenantId) {
      // Flag is specific to a tenant and context doesn't match
      return {
        key,
        value: defaultValue,
        exists: true,
        reason: 'DEFAULT', // Or custom reason
        timestamp: Date.now(),
      };
    }

    // Evaluate rules
    if (flag.rules && flag.rules.length > 0) {
      for (const rule of flag.rules) {
        if (this.matchesRule(rule, context)) {
          // Check for percentage rollout within rule
          if (rule.rollout) {
            const variationId = this.evaluateRollout(rule.rollout, context, key);
            if (variationId) {
              const variation = flag.variations.find(v => v.id === variationId);
              if (variation) {
                return {
                  key,
                  value: variation.value as T,
                  variation: variation.id,
                  exists: true,
                  reason: 'RULE_MATCH',
                  timestamp: Date.now(),
                };
              }
            }
          } else if (rule.variation) {
            // Direct variation match
            const variation = flag.variations.find(v => v.id === rule.variation);
            if (variation) {
              return {
                key,
                value: variation.value as T,
                variation: variation.id,
                exists: true,
                reason: 'TARGET_MATCH',
                timestamp: Date.now(),
              };
            }
          }
        }
      }
    }

    // Return flag default value (from DB column default_value)
    return {
      key,
      value: flag.defaultValue as T,
      exists: true,
      reason: 'DEFAULT', // Flag default
      timestamp: Date.now(),
    };
  }

  private matchesRule(rule: TargetingRule, context: FlagContext): boolean {
    return rule.conditions.every(condition => {
      const contextValue = this.getContextValue(context, condition.attribute);
      const match = this.evaluateCondition(condition, contextValue);
      return condition.negate ? !match : match;
    });
  }

  private getContextValue(context: FlagContext, attribute: string): any {
    if (attribute === 'userId') return context.userId;
    if (attribute === 'email') return context.userEmail;
    if (attribute === 'role') return context.userRole;
    if (attribute === 'tenantId') return context.tenantId;
    return context.attributes?.[attribute];
  }

  private evaluateCondition(condition: Condition, value: any): boolean {
    // Simple implementation for now
    if (value === undefined || value === null) return false;

    switch (condition.operator) {
      case 'equals': return value === condition.value;
      case 'not_equals': return value !== condition.value;
      case 'contains': return String(value).includes(condition.value);
      case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
      // Add more operators as needed
      default: return false;
    }
  }

  private evaluateRollout(rollout: PercentageRollout, context: FlagContext, flagKey: string): string | null {
    const bucketBy = rollout.bucketBy || 'userId';
    const bucketValue = this.getContextValue(context, bucketBy);

    if (!bucketValue) {
      return null; // Cannot bucket without value
    }

    const hashInput = `${flagKey}:${String(bucketValue)}:${rollout.seed || 0}`;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
    const bucket = parseInt(hash.substring(0, 8), 16) % 10000; // 0-9999 (0.00% - 99.99%)

    let accumulated = 0;
    for (const variation of rollout.variations) {
      accumulated += variation.percentage * 100; // Scale to 0-10000
      if (bucket < accumulated) {
        return variation.variation;
      }
    }

    return null; // Should ideally not reach here if percentages sum to 100
  }

  async getAllFlags(context: FlagContext): Promise<Record<string, FlagEvaluation>> {
    const result: Record<string, FlagEvaluation> = {};
    for (const key of this.cache.keys()) {
      // Best effort type inference, assuming string for bulk fetch if not known
      result[key] = await this.evaluate(key, null as any, context);
    }
    return result;
  }

  async getFlagDefinition(key: string): Promise<FlagDefinition | null> {
    return this.cache.get(key) || null;
  }

  async listFlags(): Promise<FlagDefinition[]> {
    return Array.from(this.cache.values());
  }

  async track(
    eventName: string,
    context: FlagContext,
    data?: Record<string, any>,
  ): Promise<void> {
    // No-op for now, or log to DB
  }
}
