"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const common_types_1 = require("@ga-graphai/common-types");
const index_js_1 = require("../src/index.js");
class MockConsumer {
    handler;
    topic;
    async subscribe(config) {
        this.topic = config.topic;
    }
    async run(config) {
        this.handler = config.eachMessage;
    }
    async emit(message) {
        await this.handler?.(message);
    }
    async disconnect() {
        // no-op for mock
    }
}
(0, vitest_1.describe)('KafkaGraphUpdateStream', () => {
    (0, vitest_1.it)('consumes kafka-compatible payloads to update the graph and trigger agents', async () => {
        const transport = vitest_1.vi.fn();
        const emitter = new common_types_1.StructuredEventEmitter({ transport });
        const graph = new index_js_1.OrchestrationKnowledgeGraph(emitter);
        const consumer = new MockConsumer();
        const stream = new index_js_1.KafkaGraphUpdateStream(consumer, (update) => graph.applyUpdate(update), { topic: 'kg-updates', source: 'event-hubs' });
        await stream.start();
        await consumer.emit({
            topic: consumer.topic ?? 'kg-updates',
            partition: 0,
            message: {
                value: Buffer.from(JSON.stringify({
                    services: [{ id: 'svc-stream', name: 'Stream Service' }],
                    environments: [{ id: 'env-stream', name: 'streaming', stage: 'prod', region: 'us-west-2' }],
                    incidents: [
                        {
                            id: 'stream-incident',
                            serviceId: 'svc-stream',
                            environmentId: 'env-stream',
                            severity: 'high',
                            occurredAt: new Date('2024-04-01T00:00:00Z').toISOString(),
                            status: 'open',
                        },
                    ],
                    agentTriggers: [
                        {
                            agent: 'stream-responder',
                            reason: 'incident from event hub',
                        },
                    ],
                })),
            },
        });
        const context = graph.queryService('svc-stream');
        (0, vitest_1.expect)(context?.incidents?.[0]?.id).toBe('stream-incident');
        (0, vitest_1.expect)(transport).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'summit.intelgraph.graph.updated' }));
        await stream.stop();
    });
});
