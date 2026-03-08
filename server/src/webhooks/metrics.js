"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryTotal = exports.deliveryDuration = void 0;
exports.recordDeliveryMetric = recordDeliveryMetric;
const prom_client_1 = require("prom-client");
const DELIVERY_DURATION_NAME = 'webhook_delivery_duration_seconds';
const DELIVERY_TOTAL_NAME = 'webhook_delivery_total';
exports.deliveryDuration = prom_client_1.register.getSingleMetric(DELIVERY_DURATION_NAME) ||
    new prom_client_1.Histogram({
        name: DELIVERY_DURATION_NAME,
        help: 'Webhook delivery latency in seconds',
        labelNames: ['event_type', 'outcome'],
        buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
    });
exports.deliveryTotal = prom_client_1.register.getSingleMetric(DELIVERY_TOTAL_NAME) ||
    new prom_client_1.Counter({
        name: DELIVERY_TOTAL_NAME,
        help: 'Webhook delivery outcomes',
        labelNames: ['event_type', 'outcome'],
    });
function recordDeliveryMetric(eventType, outcome, durationSeconds) {
    exports.deliveryTotal.inc({ event_type: eventType, outcome });
    if (durationSeconds !== undefined) {
        exports.deliveryDuration.observe({ event_type: eventType, outcome }, durationSeconds);
    }
}
