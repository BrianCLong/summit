"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FanoutStream = exports.KafkaStream = exports.RedisStream = void 0;
exports.buildStream = buildStream;
const redis_1 = require("redis");
const kafkajs_1 = require("kafkajs");
class RedisStream {
    c = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
    ready = this.c.connect();
    async produce(topic, ev) {
        await this.ready;
        await this.c.xAdd(`stream:${topic}`, '*', { key: ev.key, value: ev.value });
    }
    async close() {
        try {
            await this.c.quit();
        }
        catch { }
    }
}
exports.RedisStream = RedisStream;
class KafkaStream {
    kafka = new kafkajs_1.Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || 'conductor',
        brokers: (process.env.KAFKA_BROKERS || '').split(','),
        ssl: process.env.KAFKA_SSL === 'true',
        sasl: process.env.KAFKA_SASL
            ? JSON.parse(process.env.KAFKA_SASL)
            : undefined,
        logLevel: kafkajs_1.logLevel.NOTHING,
    });
    p = this.kafka.producer();
    ready = this.p.connect();
    async produce(topic, ev) {
        await this.ready;
        await this.p.send({
            topic,
            messages: [{ key: ev.key, value: ev.value, headers: ev.headers }],
        });
    }
    async close() {
        try {
            await this.p.disconnect();
        }
        catch { }
    }
}
exports.KafkaStream = KafkaStream;
class FanoutStream {
    a;
    b;
    constructor(a, b) {
        this.a = a;
        this.b = b;
    }
    async produce(topic, ev) {
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
exports.FanoutStream = FanoutStream;
function buildStream() {
    const backend = process.env.STREAM_BACKEND || 'redis'; // redis | kafka | dual
    if (backend === 'kafka')
        return new KafkaStream();
    if (backend === 'dual')
        return new FanoutStream(new RedisStream(), new KafkaStream());
    return new RedisStream();
}
