"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlers = void 0;
const ledger_js_1 = require("../provenance/ledger.js");
exports.handlers = {
    ORDER_CREATED: async (event) => {
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: event.tenantId,
            actionType: 'CREATE',
            resourceType: 'Order',
            resourceId: event.payload.orderId,
            actorId: event.actor,
            actorType: 'user',
            timestamp: new Date(),
            payload: event.payload,
            metadata: { timestamp: event.timestamp },
        });
    },
    PAYMENT_RECEIVED: async (event) => {
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: event.tenantId,
            actionType: 'UPDATE',
            resourceType: 'Order',
            resourceId: event.payload.orderId,
            actorId: event.actor,
            actorType: 'system',
            timestamp: new Date(),
            payload: event.payload,
            metadata: { timestamp: event.timestamp, paymentId: event.payload.paymentId },
        });
    },
    ORDER_FULFILLED: async (event) => {
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: event.tenantId,
            actionType: 'UPDATE',
            resourceType: 'Order',
            resourceId: event.payload.orderId,
            actorId: event.actor,
            actorType: 'job',
            timestamp: new Date(),
            payload: event.payload,
            metadata: { timestamp: event.timestamp, trackingId: event.payload.trackingId },
        });
    },
};
