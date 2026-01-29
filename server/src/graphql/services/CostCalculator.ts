// @ts-nocheck
/**
 * GraphQL Query Cost Calculator
 * Provides pluggable, configurable cost analysis for GraphQL queries
 * with support for hot-reloadable field/type weights
 */

import {
  getComplexity,
  simpleEstimator,
  fieldExtensionsEstimator,
  ComplexityEstimatorArgs,
} from 'graphql-query-complexity';
import type { GraphQLSchema, DocumentNode } from 'graphql';
import { getRedisClient } from '../../config/database.js';
import pino from 'pino';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const logger = (pino as any)();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CostConfig {
  version: string;
  defaultCosts: {
    baseField: number;
    baseListItem: number;
    baseNestedLevel: number;
  };
  typeCosts: Record<string, Record<string, number>>;
  operationCosts: {
    listMultipliers: any;
    nestedMultipliers: Record<string, number>;
    argumentMultipliers: Record<string, any>;
  };
  tenantTiers: Record<string, TenantTierLimits>;
  tenantOverrides: Record<string, TenantTierLimits>;
  userRoleLimits: Record<string, { multiplier: number; exemptFromTenantLimits: boolean }>;
}

export interface TenantTierLimits {
  maxCostPerQuery: number;
  maxCostPerMinute: number;
  maxCostPerHour: number;
  burstMultiplier: number;
}

export interface QueryCostResult {
  cost: number;
  breakdown: CostBreakdown;
}

export interface CostBreakdown {
  baseFieldCost: number;
  listMultiplierCost: number;
  nestingCost: number;
  customFieldCosts: number;
  totalFields: number;
}

/**
 * CostCalculator - Manages GraphQL query cost calculation with configurable weights
 */
export class CostCalculator {
  private config: CostConfig | null = null;
  private configPath: string;
  private redisConfigKey = 'graphql:cost:config';
  private lastConfigLoad = 0;
  private configCacheTtlMs = 60000; // 1 minute cache

  constructor(configPath?: string) {
    this.configPath =
      configPath || path.join(__dirname, '../../config/graphql-cost-config.json');
  }

  /**
   * Initialize the cost calculator and load configuration
   */
  async initialize(): Promise<void> {
    await this.loadConfig();
    this.setupConfigReload();
  }

  /**
   * Load configuration from Redis (hot config) or fallback to JSON file
   */
  private async loadConfig(): Promise<void> {
    try {
      // Try Redis first for hot-reloadable config
      const redis = getRedisClient();
      if (redis) {
        const redisConfig = await redis.get(this.redisConfigKey);
        if (redisConfig) {
          this.config = JSON.parse(redisConfig);
          this.lastConfigLoad = Date.now();
          logger.info('Loaded GraphQL cost config from Redis');
          return;
        }
      }
    } catch (error: any) {
      logger.warn({ error }, 'Failed to load cost config from Redis, falling back to file');
    }

    // Fallback to file-based config
    try {
      const fileContent = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(fileContent);
      this.lastConfigLoad = Date.now();
      logger.info({ path: this.configPath }, 'Loaded GraphQL cost config from file');

      // Optionally seed Redis with file config
      const redis = getRedisClient();
      if (redis && this.config) {
        await redis.set(this.redisConfigKey, JSON.stringify(this.config), 'EX', 3600);
      }
    } catch (error: any) {
      logger.error({ error, path: this.configPath }, 'Failed to load cost config from file');
      throw new Error(`Failed to load cost configuration: ${error.message}`);
    }
  }

  /**
   * Setup automatic config reload (check Redis periodically for updates)
   */
  private setupConfigReload(): void {
    // Only setup reload in non-test environments
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Check for config updates every minute
    setInterval(async () => {
      const now = Date.now();
      if (now - this.lastConfigLoad > this.configCacheTtlMs) {
        try {
          await this.loadConfig();
        } catch (error: any) {
          logger.error({ error }, 'Failed to reload cost config');
        }
      }
    }, this.configCacheTtlMs);
  }

  /**
   * Get current configuration
   */
  getConfig(): CostConfig {
    if (!this.config) {
      throw new Error('Cost calculator not initialized. Call initialize() first.');
    }
    return this.config;
  }

  /**
   * Update configuration in Redis for hot-reload
   */
  async updateConfig(newConfig: CostConfig): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis not available for config updates');
    }

    await redis.set(this.redisConfigKey, JSON.stringify(newConfig), 'EX', 3600);
    this.config = newConfig;
    this.lastConfigLoad = Date.now();
    logger.info('Updated GraphQL cost config in Redis');
  }

  /**
   * Calculate the cost of a GraphQL query
   */
  calculateCost(
    schema: GraphQLSchema,
    document: DocumentNode,
    variables: Record<string, any> = {}
  ): number {
    if (!this.config) {
      throw new Error('Cost calculator not initialized');
    }

    try {
      const complexity = getComplexity({
        schema,
        query: document,
        variables,
        estimators: [
          // Custom estimator using our configuration
          this.createCustomEstimator(),
          // Field extensions estimator (@complexity directive)
          fieldExtensionsEstimator(),
          // Fallback to simple estimator
          simpleEstimator({ defaultComplexity: this.config.defaultCosts.baseField }),
        ],
      });

      return complexity;
    } catch (error: any) {
      logger.error({ error }, 'Failed to calculate query cost');
      // Fail safe: return a high cost to prevent abuse
      return 10000;
    }
  }

  /**
   * Create a custom complexity estimator based on our configuration
   */
  private createCustomEstimator() {
    const config = this.config!;

    return (args: ComplexityEstimatorArgs): number | void => {
      const { type, field, args: fieldArgs, childComplexity } = args;

      // Get base cost for this field from config
      const typeName = type.name;
      const fieldName = field.name;

      let baseCost = config.typeCosts[typeName]?.[fieldName] || config.defaultCosts.baseField;

      // Apply list multipliers
      let listMultiplier = 1;
      if (fieldArgs) {
        const limit = fieldArgs.limit || fieldArgs.first || fieldArgs.take;
        if (limit && typeof limit === 'number') {
          listMultiplier = Math.min(limit, 100); // Cap at 100
        }
      }

      // Apply argument multipliers
      let argMultiplier = 1;
      if (fieldArgs) {
        // Check for depth argument
        if (fieldArgs.depth && typeof fieldArgs.depth === 'number') {
          const depthMultiplier =
            config.operationCosts.argumentMultipliers.depth?.[fieldArgs.depth] ||
            Math.pow(2, fieldArgs.depth - 1);
          argMultiplier *= depthMultiplier;
        }

        // Check for other expensive arguments
        if (fieldArgs.includeDeleted) {
          argMultiplier *= config.operationCosts.argumentMultipliers.includeDeleted || 1.5;
        }
        if (fieldArgs.includeArchived) {
          argMultiplier *= config.operationCosts.argumentMultipliers.includeArchived || 1.3;
        }
        if (fieldArgs.fullText) {
          argMultiplier *= config.operationCosts.argumentMultipliers.fullText || 2;
        }
      }

      // Calculate total cost
      const totalCost = baseCost * listMultiplier * argMultiplier + childComplexity;

      return totalCost;
    };
  }

  /**
   * Get tenant tier limits
   */
  getTenantLimits(tenantId: string, tier: string = 'free'): TenantTierLimits {
    if (!this.config) {
      throw new Error('Cost calculator not initialized');
    }

    // Check for tenant-specific override
    if (this.config.tenantOverrides[tenantId]) {
      return this.config.tenantOverrides[tenantId];
    }

    // Return tier-based limits
    return this.config.tenantTiers[tier] || this.config.tenantTiers.free;
  }

  /**
   * Get user role multiplier
   */
  getUserRoleMultiplier(role: string): number {
    if (!this.config) {
      return 1;
    }

    return this.config.userRoleLimits[role]?.multiplier || 1;
  }

  /**
   * Check if user role is exempt from tenant limits
   */
  isUserExemptFromTenantLimits(role: string): boolean {
    if (!this.config) {
      return false;
    }

    return this.config.userRoleLimits[role]?.exemptFromTenantLimits || false;
  }
}

// Singleton instance
let costCalculatorInstance: CostCalculator | null = null;

/**
 * Get or create the singleton cost calculator instance
 */
export async function getCostCalculator(): Promise<CostCalculator> {
  if (!costCalculatorInstance) {
    costCalculatorInstance = new CostCalculator();
    await costCalculatorInstance.initialize();
  }
  return costCalculatorInstance;
}

/**
 * Initialize cost calculator for testing with custom config
 */
export function createTestCostCalculator(config: CostConfig): CostCalculator {
  const calculator = new CostCalculator();
  (calculator as any).config = config;
  return calculator;
}
