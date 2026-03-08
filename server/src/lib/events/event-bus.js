"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
// @ts-nocheck
const events_1 = require("events");
const logger_js_1 = require("../../config/logger.js");
const logger_js_2 = require("../../config/logger.js");
const summit_metrics_js_1 = require("../../utils/summit-metrics.js");
class SummitEventBus extends events_1.EventEmitter {
    publish(name, data) {
        const store = logger_js_2.correlationStorage.getStore();
        const event = {
            name,
            data,
            timestamp: new Date().toISOString(),
            correlationId: store?.get('correlationId'),
            tenantId: store?.get('tenantId'),
            principalId: store?.get('principalId'),
        };
        logger_js_1.logger.info({ event }, `Event published: ${name}`);
        summit_metrics_js_1.summitMetrics
            .getCounter('summit_events_published_total', 'Total events published')
            .add(1, { kind: name, tenantId: event.tenantId });
        this.emit(name, event);
        this.emit('*', event);
    }
    subscribe(name, handler) {
        this.on(name, handler);
    }
}
exports.eventBus = new SummitEventBus();
