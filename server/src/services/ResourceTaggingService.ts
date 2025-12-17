/**
 * Resource Tagging and Cost Allocation Service
 *
 * Provides comprehensive resource tagging for cost allocation, tracking,
 * and optimization across the Summit/IntelGraph platform.
 */

import pino from 'pino';
import { getPostgresPool } from '../db/postgres';

const logger = pino({ name: 'resource-tagging' });

// Standard tag categories for cost allocation
export enum TagCategory {
  COST_CENTER = 'cost_center',
  PROJECT = 'project',
  ENVIRONMENT = 'environment',
  TEAM = 'team',
  SERVICE = 'service',
  TENANT = 'tenant',
  RESOURCE_TYPE = 'resource_type',
  OWNER = 'owner',
  BILLING_CODE = 'billing_code',
}

// Resource types that can be tagged
export enum ResourceType {
  COMPUTE = 'compute',
  DATABASE = 'database',
  STORAGE = 'storage',
  NETWORK = 'network',
  API_REQUEST = 'api_request',
  QUERY_EXECUTION = 'query_execution',
  AI_INFERENCE = 'ai_inference',
  DATA_TRANSFER = 'data_transfer',
}

export interface ResourceTag {
  category: TagCategory | string;
  key: string;
  value: string;
  metadata?: Record<string, any>;
}

export interface TaggedResource {
  resourceId: string;
  resourceType: ResourceType;
  tags: ResourceTag[];
  cost?: number;
  timestamp: Date;
  duration?: number; // Duration in milliseconds
  metadata?: Record<string, any>;
}

export interface CostAllocation {
  dimension: TagCategory | string;
  dimensionValue: string;
  totalCost: number;
  resourceCount: number;
  breakdown: {
    [resourceType: string]: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  periodStart: Date;
  periodEnd: Date;
}

export interface TaggingPolicy {
  requiredTags: TagCategory[];
  allowedValues?: {
    [category: string]: string[];
  };
  validationRules?: {
    [category: string]: (value: string) => boolean;
  };
}

export class ResourceTaggingService {
  private db = getPostgresPool();
  private tagCache = new Map<string, ResourceTag[]>();
  private cacheTTL = 300000; // 5 minutes
  private defaultPolicy: TaggingPolicy = {
    requiredTags: [
      TagCategory.ENVIRONMENT,
      TagCategory.SERVICE,
      TagCategory.COST_CENTER,
    ],
  };

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Initialize database tables for resource tagging
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.db.write(`
        CREATE TABLE IF NOT EXISTS resource_tags (
          id SERIAL PRIMARY KEY,
          resource_id VARCHAR(255) NOT NULL,
          resource_type VARCHAR(100) NOT NULL,
          tag_category VARCHAR(100) NOT NULL,
          tag_key VARCHAR(255) NOT NULL,
          tag_value TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          INDEX idx_resource_tags_resource (resource_id, resource_type),
          INDEX idx_resource_tags_category (tag_category, tag_value),
          INDEX idx_resource_tags_created (created_at)
        );

        CREATE TABLE IF NOT EXISTS resource_costs (
          id SERIAL PRIMARY KEY,
          resource_id VARCHAR(255) NOT NULL,
          resource_type VARCHAR(100) NOT NULL,
          cost DECIMAL(12, 6) NOT NULL,
          duration_ms INTEGER,
          timestamp TIMESTAMP DEFAULT NOW(),
          metadata JSONB,
          INDEX idx_resource_costs_resource (resource_id, timestamp),
          INDEX idx_resource_costs_type (resource_type, timestamp),
          INDEX idx_resource_costs_timestamp (timestamp)
        );

        CREATE TABLE IF NOT EXISTS cost_allocations (
          id SERIAL PRIMARY KEY,
          dimension VARCHAR(100) NOT NULL,
          dimension_value VARCHAR(255) NOT NULL,
          resource_type VARCHAR(100) NOT NULL,
          total_cost DECIMAL(12, 6) NOT NULL,
          resource_count INTEGER NOT NULL,
          period_start TIMESTAMP NOT NULL,
          period_end TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          INDEX idx_cost_allocations_dimension (dimension, dimension_value, period_start),
          INDEX idx_cost_allocations_period (period_start, period_end)
        );
      `);

      logger.info('Resource tagging database initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize resource tagging database');
      throw error;
    }
  }

  /**
   * Tag a resource with metadata for cost allocation
   */
  async tagResource(
    resourceId: string,
    resourceType: ResourceType,
    tags: ResourceTag[],
  ): Promise<void> {
    try {
      // Validate required tags
      this.validateTags(tags);

      // Delete existing tags for this resource
      await this.db.write(
        'DELETE FROM resource_tags WHERE resource_id = $1 AND resource_type = $2',
        [resourceId, resourceType],
      );

      // Insert new tags
      for (const tag of tags) {
        await this.db.write(
          `INSERT INTO resource_tags
           (resource_id, resource_type, tag_category, tag_key, tag_value, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            resourceId,
            resourceType,
            tag.category,
            tag.key,
            tag.value,
            tag.metadata ? JSON.stringify(tag.metadata) : null,
          ],
        );
      }

      // Update cache
      this.tagCache.set(this.getCacheKey(resourceId, resourceType), tags);

      logger.debug(
        { resourceId, resourceType, tagCount: tags.length },
        'Resource tagged',
      );
    } catch (error) {
      logger.error({ error, resourceId, resourceType }, 'Failed to tag resource');
      throw error;
    }
  }

  /**
   * Get tags for a resource
   */
  async getResourceTags(
    resourceId: string,
    resourceType: ResourceType,
  ): Promise<ResourceTag[]> {
    const cacheKey = this.getCacheKey(resourceId, resourceType);
    const cached = this.tagCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const result = await this.db.read(
        `SELECT tag_category, tag_key, tag_value, metadata
         FROM resource_tags
         WHERE resource_id = $1 AND resource_type = $2`,
        [resourceId, resourceType],
      );

      const tags: ResourceTag[] = result.rows.map((row) => ({
        category: row.tag_category,
        key: row.tag_key,
        value: row.tag_value,
        metadata: row.metadata,
      }));

      this.tagCache.set(cacheKey, tags);

      return tags;
    } catch (error) {
      logger.error({ error, resourceId, resourceType }, 'Failed to get resource tags');
      return [];
    }
  }

  /**
   * Record resource cost with associated tags
   */
  async recordResourceCost(resource: TaggedResource): Promise<void> {
    try {
      // Ensure resource is tagged
      if (!resource.tags || resource.tags.length === 0) {
        logger.warn(
          { resourceId: resource.resourceId, resourceType: resource.resourceType },
          'Recording cost for untagged resource',
        );
      }

      // Record cost
      await this.db.write(
        `INSERT INTO resource_costs
         (resource_id, resource_type, cost, duration_ms, timestamp, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          resource.resourceId,
          resource.resourceType,
          resource.cost || 0,
          resource.duration,
          resource.timestamp,
          resource.metadata ? JSON.stringify(resource.metadata) : null,
        ],
      );

      logger.debug(
        {
          resourceId: resource.resourceId,
          resourceType: resource.resourceType,
          cost: resource.cost,
        },
        'Resource cost recorded',
      );
    } catch (error) {
      logger.error({ error, resource }, 'Failed to record resource cost');
      throw error;
    }
  }

  /**
   * Get cost allocation by dimension (e.g., by team, project, environment)
   */
  async getCostAllocation(
    dimension: TagCategory | string,
    startDate: Date,
    endDate: Date,
  ): Promise<CostAllocation[]> {
    try {
      const result = await this.db.read(
        `SELECT
          rt.tag_value as dimension_value,
          rc.resource_type,
          SUM(rc.cost) as total_cost,
          COUNT(DISTINCT rc.resource_id) as resource_count
         FROM resource_costs rc
         JOIN resource_tags rt ON rc.resource_id = rt.resource_id
           AND rc.resource_type = rt.resource_type
         WHERE rt.tag_category = $1
           AND rc.timestamp >= $2
           AND rc.timestamp <= $3
         GROUP BY rt.tag_value, rc.resource_type
         ORDER BY total_cost DESC`,
        [dimension, startDate, endDate],
      );

      // Group by dimension value
      const allocations = new Map<string, CostAllocation>();

      for (const row of result.rows) {
        const dimensionValue = row.dimension_value;

        if (!allocations.has(dimensionValue)) {
          allocations.set(dimensionValue, {
            dimension,
            dimensionValue,
            totalCost: 0,
            resourceCount: 0,
            breakdown: {},
            trend: 'stable',
            periodStart: startDate,
            periodEnd: endDate,
          });
        }

        const allocation = allocations.get(dimensionValue)!;
        allocation.totalCost += parseFloat(row.total_cost);
        allocation.resourceCount += parseInt(row.resource_count);
        allocation.breakdown[row.resource_type] = parseFloat(row.total_cost);
      }

      // Calculate trends
      const allocationsArray = Array.from(allocations.values());
      for (const allocation of allocationsArray) {
        allocation.trend = await this.calculateTrend(
          dimension,
          allocation.dimensionValue,
          startDate,
          endDate,
        );
      }

      return allocationsArray;
    } catch (error) {
      logger.error({ error, dimension, startDate, endDate }, 'Failed to get cost allocation');
      throw error;
    }
  }

  /**
   * Calculate cost trend for a dimension
   */
  private async calculateTrend(
    dimension: string,
    dimensionValue: string,
    currentStart: Date,
    currentEnd: Date,
  ): Promise<'increasing' | 'decreasing' | 'stable'> {
    try {
      const periodLength = currentEnd.getTime() - currentStart.getTime();
      const previousStart = new Date(currentStart.getTime() - periodLength);
      const previousEnd = currentStart;

      const currentResult = await this.db.read(
        `SELECT SUM(rc.cost) as total
         FROM resource_costs rc
         JOIN resource_tags rt ON rc.resource_id = rt.resource_id
         WHERE rt.tag_category = $1 AND rt.tag_value = $2
           AND rc.timestamp >= $3 AND rc.timestamp <= $4`,
        [dimension, dimensionValue, currentStart, currentEnd],
      );

      const previousResult = await this.db.read(
        `SELECT SUM(rc.cost) as total
         FROM resource_costs rc
         JOIN resource_tags rt ON rc.resource_id = rt.resource_id
         WHERE rt.tag_category = $1 AND rt.tag_value = $2
           AND rc.timestamp >= $3 AND rc.timestamp <= $4`,
        [dimension, dimensionValue, previousStart, previousEnd],
      );

      const currentTotal = parseFloat(currentResult.rows[0]?.total || '0');
      const previousTotal = parseFloat(previousResult.rows[0]?.total || '0');

      if (previousTotal === 0) return 'stable';

      const change = (currentTotal - previousTotal) / previousTotal;

      if (change > 0.1) return 'increasing';
      if (change < -0.1) return 'decreasing';
      return 'stable';
    } catch (error) {
      logger.error({ error }, 'Failed to calculate trend');
      return 'stable';
    }
  }

  /**
   * Get cost summary by resource type
   */
  async getCostSummaryByResourceType(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ resourceType: string; totalCost: number; count: number }>> {
    try {
      const result = await this.db.read(
        `SELECT
          resource_type,
          SUM(cost) as total_cost,
          COUNT(*) as count
         FROM resource_costs
         WHERE timestamp >= $1 AND timestamp <= $2
         GROUP BY resource_type
         ORDER BY total_cost DESC`,
        [startDate, endDate],
      );

      return result.rows.map((row) => ({
        resourceType: row.resource_type,
        totalCost: parseFloat(row.total_cost),
        count: parseInt(row.count),
      }));
    } catch (error) {
      logger.error({ error, startDate, endDate }, 'Failed to get cost summary');
      throw error;
    }
  }

  /**
   * Validate tags against policy
   */
  private validateTags(tags: ResourceTag[]): void {
    const tagCategories = new Set(tags.map((t) => t.category));

    for (const required of this.defaultPolicy.requiredTags) {
      if (!tagCategories.has(required)) {
        throw new Error(`Required tag category missing: ${required}`);
      }
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(resourceId: string, resourceType: ResourceType): string {
    return `${resourceType}:${resourceId}`;
  }

  /**
   * Generate cost allocation report
   */
  async generateCostAllocationReport(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalCost: number;
    byEnvironment: CostAllocation[];
    byTeam: CostAllocation[];
    byService: CostAllocation[];
    byCostCenter: CostAllocation[];
    byResourceType: Array<{ resourceType: string; totalCost: number; count: number }>;
  }> {
    try {
      const [byEnvironment, byTeam, byService, byCostCenter, byResourceType] =
        await Promise.all([
          this.getCostAllocation(TagCategory.ENVIRONMENT, startDate, endDate),
          this.getCostAllocation(TagCategory.TEAM, startDate, endDate),
          this.getCostAllocation(TagCategory.SERVICE, startDate, endDate),
          this.getCostAllocation(TagCategory.COST_CENTER, startDate, endDate),
          this.getCostSummaryByResourceType(startDate, endDate),
        ]);

      const totalCost = byResourceType.reduce((sum, item) => sum + item.totalCost, 0);

      return {
        totalCost,
        byEnvironment,
        byTeam,
        byService,
        byCostCenter,
        byResourceType,
      };
    } catch (error) {
      logger.error({ error, startDate, endDate }, 'Failed to generate cost report');
      throw error;
    }
  }

  /**
   * Get untagged resources
   */
  async getUntaggedResources(
    resourceType?: ResourceType,
    limit: number = 100,
  ): Promise<Array<{ resourceId: string; resourceType: string; lastSeen: Date }>> {
    try {
      const query = resourceType
        ? `SELECT DISTINCT rc.resource_id, rc.resource_type, MAX(rc.timestamp) as last_seen
           FROM resource_costs rc
           LEFT JOIN resource_tags rt ON rc.resource_id = rt.resource_id
             AND rc.resource_type = rt.resource_type
           WHERE rt.resource_id IS NULL
             AND rc.resource_type = $1
           GROUP BY rc.resource_id, rc.resource_type
           ORDER BY last_seen DESC
           LIMIT $2`
        : `SELECT DISTINCT rc.resource_id, rc.resource_type, MAX(rc.timestamp) as last_seen
           FROM resource_costs rc
           LEFT JOIN resource_tags rt ON rc.resource_id = rt.resource_id
             AND rc.resource_type = rt.resource_type
           WHERE rt.resource_id IS NULL
           GROUP BY rc.resource_id, rc.resource_type
           ORDER BY last_seen DESC
           LIMIT $1`;

      const params = resourceType ? [resourceType, limit] : [limit];
      const result = await this.db.read(query, params);

      return result.rows.map((row) => ({
        resourceId: row.resource_id,
        resourceType: row.resource_type,
        lastSeen: row.last_seen,
      }));
    } catch (error) {
      logger.error({ error, resourceType }, 'Failed to get untagged resources');
      throw error;
    }
  }
}

// Singleton instance
export const resourceTagging = new ResourceTaggingService();

// Helper function to create standard tags
export function createStandardTags(config: {
  environment: string;
  service: string;
  costCenter: string;
  team?: string;
  project?: string;
  owner?: string;
}): ResourceTag[] {
  const tags: ResourceTag[] = [
    {
      category: TagCategory.ENVIRONMENT,
      key: 'environment',
      value: config.environment,
    },
    {
      category: TagCategory.SERVICE,
      key: 'service',
      value: config.service,
    },
    {
      category: TagCategory.COST_CENTER,
      key: 'cost_center',
      value: config.costCenter,
    },
  ];

  if (config.team) {
    tags.push({
      category: TagCategory.TEAM,
      key: 'team',
      value: config.team,
    });
  }

  if (config.project) {
    tags.push({
      category: TagCategory.PROJECT,
      key: 'project',
      value: config.project,
    });
  }

  if (config.owner) {
    tags.push({
      category: TagCategory.OWNER,
      key: 'owner',
      value: config.owner,
    });
  }

  return tags;
}
