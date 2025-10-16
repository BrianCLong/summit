import { createClient as createRedis } from 'redis';
import { Kafka, logLevel, Producer } from 'kafkajs';

export type Event = {
  key: string;
  value: string;
  headers?: Record<string, string>;
};
export interface Stream {
  produce(topic: string, ev: Event): Promise<void>;
  close(): Promise<void>;
}

export class RedisStream implements Stream {
  private c = createRedis({ url: process.env.REDIS_URL! });
  private ready = this.c.connect();
  async produce(topic: string, ev: Event) {
    await this.ready;
    await this.c.xAdd(`stream:${topic}`, '*', { key: ev.key, value: ev.value });
  }
  async close() {
    try {
      await this.c.quit();
    } catch {}
  }
}

export class KafkaStream implements Stream {
  private kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'conductor',
    brokers: (process.env.KAFKA_BROKERS || '').split(','),
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: process.env.KAFKA_SASL
      ? JSON.parse(process.env.KAFKA_SASL)
      : undefined,
    logLevel: logLevel.NOTHING,
  });
  private p: Producer = this.kafka.producer();
  private ready = this.p.connect();
  async produce(topic: string, ev: Event) {
    await this.ready;
    await this.p.send({
      topic,
      messages: [{ key: ev.key, value: ev.value, headers: ev.headers as any }],
    });
  }
  async close() {
    try {
      await this.p.disconnect();
    } catch {}
  }
}

export class FanoutStream implements Stream {
  constructor(
    private a: Stream,
    private b: Stream,
  ) {}
  async produce(topic: string, ev: Event) {
    // best-effort fanout; do not block on slow leg
    await Promise.allSettled([
      this.a.produce(topic, ev),
      this.b.produce(topic, ev),
    ]);
  }
  async close() {
    await Promise.allSettled([this.a.close(), this.b.close()]);
  }
}

export function buildStream(): Stream {
  const backend = process.env.STREAM_BACKEND || 'redis'; // redis | kafka | dual
  if (backend === 'kafka') return new KafkaStream();
  if (backend === 'dual')
    return new FanoutStream(new RedisStream(), new KafkaStream());
  return new RedisStream();
}
