"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventService = exports.EventService = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const pg_js_1 = require("../db/pg.js");
const types_js_1 = require("./types.js");
const service_js_1 = require("../webhooks/service.js");
// Reusing WebhookService logic for now as it implements the core "sink" logic (queuing, retries, etc)
// In a full implementation, we would abstract SinkService generic interface.
class EventService {
    webhookService;
    constructor() {
        this.webhookService = new service_js_1.WebhookService();
    }
    async publish(event) {
        logger_js_1.default.info('Publishing event', { eventId: event.event_id, type: event.type, tenantId: event.tenant_id });
        // 1. Persist to generic event log (outbox)
        await this.persistEvent(event);
        // 2. Dispatch to sinks
        // For now, we only support Webhook sinks which are managed by WebhookService/Repository.
        // We map EventEnvelope to the payload expected by WebhookService.
        // Check for webhook subscriptions (sinks)
        // Note: The current WebhookService fetches subscriptions itself.
        // We just need to trigger it.
        await this.webhookService.enqueueEvent(event.tenant_id, event.type, // Cast to any as WebhookEventType might be strict, but we want generic string support
        event, // The whole envelope is the payload
        event.event_id // Use event_id as idempotency key
        );
        // TODO: Handle other sink types (QUEUE)
        // V1: Check for generic SIEM sink (simplified)
        try {
            // We import dynamically to avoid circular deps if any, or just use the manager
            const { siemManager } = await Promise.resolve().then(() => __importStar(require('../integrations/siem/manager.js')));
            // Simple mapping to SIEMEvent
            const siemEvent = {
                id: event.event_id,
                timestamp: new Date(event.occurred_at),
                eventType: event.type,
                source: 'switchboard',
                severity: 'medium', // default
                message: `Event ${event.type} occurred`,
                tenantId: event.tenant_id,
                details: event.payload,
                tags: []
            };
            await siemManager.exportEvent(event.tenant_id, siemEvent);
        }
        catch (e) {
            logger_js_1.default.error('Failed to dispatch to SIEM', { error: e });
            // Don't block main flow
        }
    }
    async persistEvent(event) {
        // Store in a durable event log table for replayability
        await pg_js_1.pg.write(`INSERT INTO event_log (
        id, tenant_id, type, occurred_at, actor_id, payload, schema_version, receipt_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING`, [
            event.event_id,
            event.tenant_id,
            event.type,
            event.occurred_at,
            event.actor.id,
            event.payload,
            event.schema_version,
            event.receipt_ref
        ], { tenantId: event.tenant_id });
    }
    async replay(query, actorId) {
        logger_js_1.default.info('Initiating event replay', { query, actorId });
        // 1. Fetch events matching query
        const events = await pg_js_1.pg.readMany(`SELECT * FROM event_log
       WHERE tenant_id = $1
       AND occurred_at >= $2
       AND occurred_at <= $3
       ${query.eventTypes ? 'AND type = ANY($4)' : ''}
       ORDER BY occurred_at ASC`, [
            query.tenantId,
            query.startTime.toISOString(),
            query.endTime.toISOString(),
            query.eventTypes
        ].filter(x => x !== undefined), { tenantId: query.tenantId });
        if (events.length === 0) {
            return 'No events found to replay';
        }
        // 2. Republish events
        // We regenerate event_id to treat them as new deliveries of the same historical event?
        // Or we keep event_id and let idempotency handle it?
        // "Replay emits a receipt and records the replay window + sink ids"
        // Usually replay means re-triggering sinks.
        // If we use the same event_id, the WebhookService idempotency check might skip it if it succeeded before.
        // We might need to generate a "replay_id" or force delivery.
        // For V1, let's assume we want to re-deliver.
        // We will wrap the original event in a Replay envelope or just re-send it.
        // If we re-send with same ID, we need to bypass idempotency or clear status.
        const replayReceipt = (0, crypto_1.randomUUID)(); // Placeholder for actual provenance receipt
        for (const event of events) {
            // For replay, we might want to tag it.
            const replayedEvent = {
                ...event,
                resource_refs: [...(event.resource_refs || []), { type: 'replay_receipt', id: replayReceipt }]
            };
            // We use a new idempotency key for the delivery to ensure it goes through
            // But we keep the original event content.
            const deliveryIdempotencyKey = `${event.event_id}-replay-${replayReceipt}`;
            await this.webhookService.enqueueEvent(event.tenant_id, event.type, replayedEvent, deliveryIdempotencyKey);
        }
        return replayReceipt;
    }
    async createSink(config) {
        if (config.type === types_js_1.SinkType.WEBHOOK) {
            // Map generic config to WebhookSubscription
            await pg_js_1.pg.write(`INSERT INTO webhook_subscriptions (
                  id, tenant_id, event_type, target_url, secret, active
              ) VALUES ($1, $2, $3, $4, $5, $6)`, [
                config.id || (0, crypto_1.randomUUID)(),
                config.tenant_id,
                // If filter_types is generic, we might need multiple subscriptions or a wildcard.
                // Current WebhookService seems to match on specific event_type.
                // For now, assume config.filter_types[0] or similar.
                config.filter_types?.[0] || '*',
                config.config.url,
                config.config.secret,
                config.enabled
            ], { tenantId: config.tenant_id });
        }
        // TODO generic sink storage
    }
}
exports.EventService = EventService;
exports.eventService = new EventService();
