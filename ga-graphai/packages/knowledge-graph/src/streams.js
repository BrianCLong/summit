"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaGraphUpdateStream = void 0;
function toUtf8(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (value instanceof Buffer) {
        return value.toString('utf8');
    }
    return String(value);
}
class KafkaGraphUpdateStream {
    consumer;
    config;
    applyUpdate;
    constructor(consumer, applyUpdate, config) {
        this.consumer = consumer;
        this.config = config;
        this.applyUpdate = applyUpdate;
    }
    async start() {
        if (this.consumer.connect) {
            await this.consumer.connect();
        }
        await this.consumer.subscribe({
            topic: this.config.topic,
            fromBeginning: this.config.fromBeginning ?? false,
        });
        await this.consumer.run({
            eachMessage: async (payload) => {
                try {
                    const update = await this.parseUpdate(payload);
                    const snapshot = this.applyUpdate({
                        source: this.config.source,
                        ingress: this.config.ingress ?? 'message-broker',
                        topic: payload.topic,
                        ...update,
                    });
                    await this.config.onApplied?.(snapshot);
                }
                catch (error) {
                    this.config.logger?.error?.('intelgraph.kg.stream.error', {
                        topic: payload.topic,
                        reason: error instanceof Error ? error.message : String(error),
                    });
                }
            },
        });
    }
    async stop() {
        if (this.consumer.stop) {
            await this.consumer.stop();
        }
        await this.consumer.disconnect();
    }
    async parseUpdate(payload) {
        if (this.config.parseUpdate) {
            return this.config.parseUpdate(payload);
        }
        const body = toUtf8(payload.message.value);
        const parsed = body ? JSON.parse(body) : {};
        if (!parsed.source) {
            parsed.source = this.config.source;
        }
        if (!parsed.ingress) {
            parsed.ingress = this.config.ingress ?? 'message-broker';
        }
        if (!parsed.topic) {
            parsed.topic = payload.topic;
        }
        if (!parsed.correlationId) {
            const candidateHeader = payload.message.headers?.['correlation-id'];
            if (candidateHeader) {
                parsed.correlationId = candidateHeader;
            }
        }
        return parsed;
    }
}
exports.KafkaGraphUpdateStream = KafkaGraphUpdateStream;
