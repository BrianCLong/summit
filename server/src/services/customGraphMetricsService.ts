import neo4j, { Driver } from 'neo4j-driver';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import baseLogger from '../config/logger.js';
import { getNeo4jDriver, getRedisClient } from '../config/database.js';
import { metricTemplates, MetricTemplate } from '../graph/metrics/templates.js';

export interface CustomMetricDefinition {
  key: string;
  description?: string;
  cypher: string;
  parameters?: Record<string, unknown>;
  ttlSeconds?: number;
}

export interface CustomMetricResult {
  key: string;
  description?: string;
  data: unknown;
  cached: boolean;
  executedAt: string;
}

export interface MetricExecutionContext {
  tenantId: string;
  investigationId?: string;
  useCache?: boolean;
}

const DEFAULT_TTL_SECONDS = 300;
const WRITE_PATTERN =
  /\b(create|merge|delete|set\s+\w+|drop|remove|call\s+db\.[\w.]*write|call\s+apoc\.[\w.]*write|call\s+apoc\.periodic\.iterate)\b/i;

export class CustomGraphMetricsService {
  private driver: Driver;
  private redis: Redis | null;
  private logger = baseLogger.child({ name: 'CustomGraphMetricsService' });
  private now: () => Date;

  constructor(options?: { driver?: Driver; redis?: Redis | null; now?: () => Date }) {
    this.driver = options?.driver ?? getNeo4jDriver();
    this.redis = options?.redis ?? getRedisClient();
    this.now = options?.now ?? (() => new Date());
  }

  public listTemplates(): MetricTemplate[] {
    return metricTemplates;
  }

  public async executeMetrics(
    definitions: CustomMetricDefinition[],
    context: MetricExecutionContext,
  ): Promise<CustomMetricResult[]> {
    if (!definitions?.length) {
      throw new Error('At least one metric definition is required');
    }
    this.assertTenant(context.tenantId);

    const sanitizedDefs = definitions.map((definition) => this.validateDefinition(definition));
    const results: CustomMetricResult[] = [];

    for (const definition of sanitizedDefs) {
      const cacheKey = this.buildCacheKey(definition, context);
      const ttl = Math.max(definition.ttlSeconds ?? DEFAULT_TTL_SECONDS, 5);
      const params = {
        tenantId: context.tenantId,
        investigationId: context.investigationId,
        ...(definition.parameters ?? {}),
      };

      if (context.useCache !== false) {
        const cached = await this.readFromCache(cacheKey);
        if (cached) {
          results.push({
            key: definition.key,
            description: definition.description,
            data: cached,
            cached: true,
            executedAt: this.now().toISOString(),
          });
          continue;
        }
      }

      const data = await this.runCypher(definition.cypher, params);

      if (context.useCache !== false) {
        await this.writeToCache(cacheKey, data, ttl);
      }

      results.push({
        key: definition.key,
        description: definition.description,
        data,
        cached: false,
        executedAt: this.now().toISOString(),
      });
    }

    return results;
  }

  private assertTenant(tenantId: string) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Tenant ID is required for metric execution');
    }
  }

  private validateDefinition(definition: CustomMetricDefinition): CustomMetricDefinition {
    if (!definition.key?.trim()) {
      throw new Error('Metric key is required');
    }
    if (!definition.cypher?.trim()) {
      throw new Error('Metric cypher is required');
    }

    const normalizedCypher = definition.cypher.trim();
    if (WRITE_PATTERN.test(normalizedCypher)) {
      throw new Error(`Write operation detected in metric "${definition.key}"`);
    }

    if (definition.ttlSeconds !== undefined && (!Number.isFinite(definition.ttlSeconds) || definition.ttlSeconds <= 0)) {
      throw new Error(`Metric "${definition.key}" has invalid ttlSeconds`);
    }

    return {
      ...definition,
      key: definition.key.trim(),
      cypher: normalizedCypher,
    };
  }

  private buildCacheKey(definition: CustomMetricDefinition, context: MetricExecutionContext) {
    const hash = createHash('sha256')
      .update(definition.cypher)
      .update(JSON.stringify(definition.parameters ?? {}))
      .digest('hex')
      .slice(0, 32);
    const scope = context.investigationId ? `inv:${context.investigationId}` : 'global';
    return `graph:metric:${context.tenantId}:${scope}:${definition.key}:${hash}`;
  }

  private async readFromCache(cacheKey: string) {
    if (!this.redis) {
      return null;
    }
    try {
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn({ err: error, cacheKey }, 'Failed to read custom metric cache');
      return null;
    }
  }

  private async writeToCache(cacheKey: string, data: unknown, ttl: number) {
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.warn({ err: error, cacheKey }, 'Failed to write custom metric cache');
    }
  }

  private async runCypher(cypher: string, params: Record<string, unknown>) {
    const session = this.driver.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const res = await session.run(cypher, params);
      return res.records.map((record) => this.serializeRecord(record.toObject()));
    } finally {
      await session.close();
    }
  }

  private serializeRecord(record: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.serializeValue(value)]),
    );
  }

  private serializeValue(value: unknown): unknown {
    if (neo4j.isInt(value as neo4j.Integer)) {
      return (value as neo4j.Integer).toNumber();
    }
    if (Array.isArray(value)) {
      return value.map((entry) => this.serializeValue(entry));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (this.isNeo4jNode(value)) {
      return {
        id: this.serializeValue((value as any).identity),
        labels: [...((value as any).labels || [])],
        properties: this.serializeValue((value as any).properties || {}),
      };
    }
    if (this.isNeo4jRelationship(value)) {
      return {
        id: this.serializeValue((value as any).identity),
        type: (value as any).type,
        start: this.serializeValue((value as any).start),
        end: this.serializeValue((value as any).end),
        properties: this.serializeValue((value as any).properties || {}),
      };
    }
    if (this.isNeo4jPath(value)) {
      return {
        start: this.serializeValue((value as any).start),
        end: this.serializeValue((value as any).end),
        segments: ((value as any).segments || []).map((segment: any) => ({
          start: this.serializeValue(segment.start),
          end: this.serializeValue(segment.end),
          relationship: this.serializeValue(segment.relationship),
        })),
      };
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, this.serializeValue(entry)]),
    );
  }

  private isNeo4jNode(value: unknown) {
    return value && typeof value === 'object' && value.constructor?.name === 'Node';
  }

  private isNeo4jRelationship(value: unknown) {
    return value && typeof value === 'object' && value.constructor?.name === 'Relationship';
  }

  private isNeo4jPath(value: unknown) {
    return value && typeof value === 'object' && value.constructor?.name === 'Path';
  }
}

export default CustomGraphMetricsService;
