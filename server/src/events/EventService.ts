import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';
import { pg } from '../db/pg.js';
import { EventEnvelope, EventSinkConfig, ReplayQuery, SinkType } from './types.js';
import { webhookRepository } from '../webhooks/repository.js';
import { WebhookService } from '../webhooks/service.js';

// Reusing WebhookService logic for now as it implements the core "sink" logic (queuing, retries, etc)
// In a full implementation, we would abstract SinkService generic interface.

export class EventService {
  private webhookService: WebhookService;

  constructor() {
    this.webhookService = new WebhookService();
  }

  async publish(event: EventEnvelope) {
    logger.info('Publishing event', { eventId: event.event_id, type: event.type, tenantId: event.tenant_id });

    // 1. Persist to generic event log (outbox)
    await this.persistEvent(event);

    // 2. Dispatch to sinks
    // For now, we only support Webhook sinks which are managed by WebhookService/Repository.
    // We map EventEnvelope to the payload expected by WebhookService.

    // Check for webhook subscriptions (sinks)
    // Note: The current WebhookService fetches subscriptions itself.
    // We just need to trigger it.

    await this.webhookService.enqueueEvent(
      event.tenant_id,
      event.type as any, // Cast to any as WebhookEventType might be strict, but we want generic string support
      event, // The whole envelope is the payload
      event.event_id // Use event_id as idempotency key
    );

    // TODO: Handle other sink types (QUEUE)

    // V1: Check for generic SIEM sink (simplified)
    try {
        // We import dynamically to avoid circular deps if any, or just use the manager
        const { siemManager } = await import('../integrations/siem/manager.js');
        // Simple mapping to SIEMEvent
        const siemEvent = {
            id: event.event_id,
            timestamp: new Date(event.occurred_at),
            eventType: event.type,
            source: 'switchboard',
            severity: 'medium' as any, // default
            message: `Event ${event.type} occurred`,
            tenantId: event.tenant_id,
            details: event.payload,
            tags: []
        };
        await siemManager.exportEvent(event.tenant_id, siemEvent);
    } catch (e: any) {
        logger.error('Failed to dispatch to SIEM', { error: e });
        // Don't block main flow
    }
  }

  async persistEvent(event: EventEnvelope) {
    // Store in a durable event log table for replayability
    await pg.write(
      `INSERT INTO event_log (
        id, tenant_id, type, occurred_at, actor_id, payload, schema_version, receipt_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING`,
      [
        event.event_id,
        event.tenant_id,
        event.type,
        event.occurred_at,
        event.actor.id,
        event.payload,
        event.schema_version,
        event.receipt_ref
      ],
      { tenantId: event.tenant_id }
    );
  }

  async replay(query: ReplayQuery, actorId: string): Promise<string> {
    logger.info('Initiating event replay', { query, actorId });

    // 1. Fetch events matching query
    const events = await pg.readMany(
      `SELECT * FROM event_log
       WHERE tenant_id = $1
       AND occurred_at >= $2
       AND occurred_at <= $3
       ${query.eventTypes ? 'AND type = ANY($4)' : ''}
       ORDER BY occurred_at ASC`,
      [
        query.tenantId,
        query.startTime.toISOString(),
        query.endTime.toISOString(),
        query.eventTypes
      ].filter(x => x !== undefined),
      { tenantId: query.tenantId }
    );

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

    const replayReceipt = randomUUID(); // Placeholder for actual provenance receipt

    for (const event of events) {
      // For replay, we might want to tag it.
      const replayedEvent = {
        ...event,
        resource_refs: [...(event.resource_refs || []), { type: 'replay_receipt', id: replayReceipt }]
      };

      // We use a new idempotency key for the delivery to ensure it goes through
      // But we keep the original event content.
      const deliveryIdempotencyKey = `${event.event_id}-replay-${replayReceipt}`;

      await this.webhookService.enqueueEvent(
        event.tenant_id,
        event.type as any,
        replayedEvent,
        deliveryIdempotencyKey
      );
    }

    return replayReceipt;
  }

  async createSink(config: EventSinkConfig) {
      if (config.type === SinkType.WEBHOOK) {
          // Map generic config to WebhookSubscription
          await pg.write(
              `INSERT INTO webhook_subscriptions (
                  id, tenant_id, event_type, target_url, secret, active
              ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                  config.id || randomUUID(),
                  config.tenant_id,
                  // If filter_types is generic, we might need multiple subscriptions or a wildcard.
                  // Current WebhookService seems to match on specific event_type.
                  // For now, assume config.filter_types[0] or similar.
                  config.filter_types?.[0] || '*',
                  config.config.url,
                  config.config.secret,
                  config.enabled
              ],
              { tenantId: config.tenant_id }
          );
      }
      // TODO generic sink storage
  }
}

export const eventService = new EventService();
