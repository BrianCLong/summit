import Redis from 'ioredis';
import { neighborhoodCacheHitRatio, neighborhoodCacheLatencyMs } from '../monitoring/metrics.js';

export interface Graph {
  nodes: Array<{ id: string }>;
  edges: Array<any>;
}

export class NeighborhoodCache {
  private hits = 0;
  private total = 0;
  private ttl: number;
  constructor(private redis: Redis, ttl = 300) {
    this.ttl = ttl;
  }

  private key(tenantId: string, investigationId: string, entityId: string, radius: number): string {
    return `nbhd:${tenantId}:${investigationId}:${entityId}:${radius}`;
  }

  private tagKey(tenantId: string, investigationId: string, entityId: string): string {
    return `nbhd:tag:${tenantId}:${investigationId}:${entityId}`;
  }

  async get(
    tenantId: string,
    investigationId: string,
    entityId: string,
    radius: number
  ): Promise<Graph | null> {
    const key = this.key(tenantId, investigationId, entityId, radius);
    const start = Date.now();
    const cached = await this.redis.get(key);
    neighborhoodCacheLatencyMs.observe(Date.now() - start);
    this.total++;
    if (cached) {
      this.hits++;
      neighborhoodCacheHitRatio.set(this.hits / this.total);
      return JSON.parse(cached);
    }
    neighborhoodCacheHitRatio.set(this.hits / this.total);
    return null;
  }

  async set(
    tenantId: string,
    investigationId: string,
    entityId: string,
    radius: number,
    data: Graph
  ): Promise<void> {
    const key = this.key(tenantId, investigationId, entityId, radius);
    await this.redis.set(key, JSON.stringify(data), 'EX', this.ttl);
    const ids = new Set<string>([entityId, ...data.nodes.map(n => n.id)]);
    for (const id of ids) {
      await this.redis.sadd(this.tagKey(tenantId, investigationId, id), key);
    }
  }

  async invalidate(
    tenantId: string,
    investigationId: string,
    entityIds: string[]
  ): Promise<void> {
    for (const id of entityIds) {
      const tKey = this.tagKey(tenantId, investigationId, id);
      const keys = await this.redis.smembers(tKey);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      await this.redis.del(tKey);
    }
  }
}

export default NeighborhoodCache;
