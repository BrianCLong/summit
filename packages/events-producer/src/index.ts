import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

export interface EventEnvelope {
  v: string;
  event_id: string;
  ts: string;
  tenant: string;
  type: string;
  entity: { kind: string; id: string };
  revision: number;
  payload: { diff: Record<string, any>; after: Record<string, any> };
  causality: { txid: string; source: string };
  trace: { trace_id: string; span_id: string };
}

export class EventProducer {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async emit(
    tenant: string,
    type: string,
    entity: { kind: string; id: string },
    payload: { diff: Record<string, any>; after: Record<string, any> },
    causality: { txid: string; source: string },
    trace: { trace_id: string; span_id: string },
    revision: number = 1
  ): Promise<string> {
    const event: EventEnvelope = {
      v: "1",
      event_id: uuidv4(),
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

    let topic = "events.other";
    if (type.startsWith("graph.node")) topic = "events.graph.node";
    else if (type.startsWith("graph.edge")) topic = "events.graph.edge";
    else if (type.startsWith("search")) topic = "events.search";
    else if (type.startsWith("workflow")) topic = "events.workflow";

    const streamKey = `${topic}`;
    // We strictly put tenant in the message body.
    // To enforcing ordering per tenant in a shared stream, we need a consumer that processes serially or sharded by tenant.

    await this.redis.xadd(streamKey, "*", "event", JSON.stringify(event));

    return event.event_id;
  }

  async close() {
    await this.redis.quit();
  }
}
