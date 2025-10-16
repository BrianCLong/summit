import { neighborhoodCacheHitRatio, neighborhoodCacheLatencyMs, } from '../monitoring/metrics.js';
import { getNeo4jDriver } from '../config/database.js';
import { expandNeighborhood } from './GraphOpsService.js';
export class NeighborhoodCache {
    redis;
    hits = 0;
    total = 0;
    ttl;
    constructor(redis, ttl = 300) {
        this.redis = redis;
        this.ttl = ttl;
        this.startBackgroundSync();
    }
    startBackgroundSync() {
        import('node-cron')
            .then((cron) => {
            cron.schedule('0 * * * *', async () => {
                const driver = getNeo4jDriver();
                const session = driver.session();
                try {
                    const ctxRes = await session.run('MATCH (n:Entity) RETURN DISTINCT n.tenantId AS tenantId, n.investigationId AS investigationId');
                    for (const record of ctxRes.records) {
                        const tenantId = record.get('tenantId');
                        const investigationId = record.get('investigationId');
                        if (!tenantId || !investigationId)
                            continue;
                        const topRes = await session.run(`MATCH (e:Entity {tenantId: $tenantId, investigationId: $investigationId})-[r]-(m:Entity {tenantId: $tenantId, investigationId: $investigationId})
                 RETURN e.id AS id, count(r) AS score
                 ORDER BY score DESC
                 LIMIT 10`, { tenantId, investigationId });
                        for (const rec of topRes.records) {
                            const entityId = rec.get('id');
                            const graph = await expandNeighborhood(entityId, 2, {
                                tenantId,
                                investigationId,
                            });
                            await this.set(tenantId, investigationId, entityId, 2, graph);
                        }
                    }
                }
                catch (err) {
                    console.error('Neighborhood cache prewarm failed', err);
                }
                finally {
                    await session.close();
                }
            });
        })
            .catch((err) => {
            console.error('node-cron not available, skipping neighborhood prewarm', err);
        });
    }
    key(tenantId, investigationId, entityId, radius) {
        return `nbhd:${tenantId}:${investigationId}:${entityId}:${radius}`;
    }
    tagKey(tenantId, investigationId, entityId) {
        return `nbhd:tag:${tenantId}:${investigationId}:${entityId}`;
    }
    async get(tenantId, investigationId, entityId, radius) {
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
    async set(tenantId, investigationId, entityId, radius, data) {
        const key = this.key(tenantId, investigationId, entityId, radius);
        await this.redis.set(key, JSON.stringify(data), 'EX', this.ttl);
        const ids = new Set([entityId, ...data.nodes.map((n) => n.id)]);
        for (const id of ids) {
            await this.redis.sadd(this.tagKey(tenantId, investigationId, id), key);
        }
    }
    async invalidate(tenantId, investigationId, entityIds) {
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
//# sourceMappingURL=neighborhood-cache.js.map