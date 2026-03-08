"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEdgeIngestionApp = createEdgeIngestionApp;
const core_js_1 = require("../runtime/core.js");
class PersistencePlugin {
    onPersist;
    name = 'persistence';
    version = '0.1.0';
    constructor(onPersist) {
        this.onPersist = onPersist;
    }
    supportsEvent(event) {
        return event.type === 'sensor.ingested';
    }
    async onEvent(event, context) {
        context.logger.info('persisting sensor payload', {
            correlationId: event.metadata?.correlationId
        });
        await this.onPersist?.(event.payload);
    }
}
class TelemetryPlugin {
    name = 'telemetry';
    version = '0.1.0';
    supportsEvent(event) {
        return event.type.startsWith('sensor.');
    }
    onEvent(event, context) {
        const payloadSize = JSON.stringify(event.payload).length;
        context.metrics.recordGauge('payload.size.bytes', payloadSize);
        context.metrics.recordCounter('payload.events');
        if (payloadSize > 2048) {
            context.logger.warn('payload exceeds expected size', {
                payloadSize,
                correlationId: event.metadata?.correlationId
            });
        }
    }
}
function createEdgeIngestionApp(options = {}) {
    const runtime = options.logger ? (0, core_js_1.createRuntime)({ logger: options.logger }) : (0, core_js_1.createRuntime)();
    const transform = options.transform ?? ((event) => event);
    runtime.registerPlugin(new TelemetryPlugin());
    runtime.registerPlugin(new PersistencePlugin(options.onPersist));
    return {
        runtime,
        async ingest(event) {
            const transformed = transform(event);
            if (transformed !== event) {
                runtime.context.logger.info('event transformed', {
                    fromType: event.type,
                    toType: transformed.type
                });
            }
            runtime.context.metrics.recordCounter('transform.executed');
            await runtime.emit(transformed);
        }
    };
}
