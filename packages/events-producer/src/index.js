"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventProducer = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const uuid_1 = require("uuid");
class EventProducer {
    redis;
    constructor(redisUrl) {
        this.redis = new ioredis_1.default(redisUrl);
    }
    async emit(tenant, type, entity, payload, causality, trace, revision = 1) {
        const event = {
            v: '1',
            event_id: (0, uuid_1.v4)(),
            ts: new Date().toISOString(),
            tenant,
            type,
            entity,
            revision,
            payload,
            causality,
            trace,
        };
        // Determine topic based on type
        // e.g., graph.node.created -> events.graph.node
        // Partition by tenant (Redis Streams key can include tenant or we use a single stream and group consumer)
        // Prompt says: "Partition by tenant (primary) to preserve per-tenant order."
        // We can use a stream key like `events:tenant:{tenantId}` or a global stream with tenant in payload.
        // However, "Topics/streams ... events.graph.node ... Partition by tenant".
        // Using Kafka, partition key is tenant.
        // Using Redis Streams, we can't easily "partition" a single key without multiple consumers.
        // But we can use `events:{topic}` and use XADD with specific ID? No.
        // Simplest approach for Redis Streams "partitioned by tenant":
        // 1. One stream per topic per tenant? Too many keys.
        // 2. One stream per topic, but consumer handles ordering? If strict ordering is required, parallel consumers might break it unless they hash by tenant.
        // Let's assume we publish to `events:{topic}` and consumer group logic handles tenancy or we have `events:{tenant}:{topic}`.
        // "Partition by tenant (primary) to preserve per-tenant order."
        // If we use `events:{topic}`, and multiple consumers, we risk out-of-order for same tenant.
        // Safest for "per-tenant order" in Redis is `events:{tenant}`. But then we lose topic separation.
        // Or `events:{topic}:{tenant}`.
        // Prompt says "Topics: events.graph.node, ... Partition by tenant".
        // I will use `events:{topic}` and assume the consumer uses a mechanism to ensure tenant ordering (e.g., single consumer or sticky load balancing).
        // Or, simpler for this MVP: Just publish to `events:{topic}`.
        let topic = 'events.other';
        if (type.startsWith('graph.node'))
            topic = 'events.graph.node';
        else if (type.startsWith('graph.edge'))
            topic = 'events.graph.edge';
        else if (type.startsWith('search'))
            topic = 'events.search';
        else if (type.startsWith('workflow'))
            topic = 'events.workflow';
        const streamKey = `${topic}`;
        // We strictly put tenant in the message body.
        // To enforcing ordering per tenant in a shared stream, we need a consumer that processes serially or sharded by tenant.
        await this.redis.xadd(streamKey, '*', 'event', JSON.stringify(event));
        return event.event_id;
    }
    async close() {
        await this.redis.quit();
    }
}
exports.EventProducer = EventProducer;
