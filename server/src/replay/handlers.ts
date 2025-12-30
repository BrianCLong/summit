import { provenanceLedger } from '../provenance/ledger.js';

export type EventHandler = (event: any) => Promise<void>;

export const handlers: Record<string, EventHandler> = {
  ORDER_CREATED: async (event) => {
    await provenanceLedger.appendEntry({
      tenantId: event.tenantId,
      actionType: 'CREATE',
      resourceType: 'Order',
      resourceId: event.payload.orderId,
      actorId: event.actor,
      actorType: 'user',
      payload: event.payload,
      metadata: { timestamp: event.timestamp },
    });
  },
  PAYMENT_RECEIVED: async (event) => {
    await provenanceLedger.appendEntry({
      tenantId: event.tenantId,
      actionType: 'UPDATE',
      resourceType: 'Order',
      resourceId: event.payload.orderId,
      actorId: event.actor,
      actorType: 'system',
      payload: event.payload,
      metadata: { timestamp: event.timestamp, paymentId: event.payload.paymentId },
    });
  },
  ORDER_FULFILLED: async (event) => {
    await provenanceLedger.appendEntry({
      tenantId: event.tenantId,
      actionType: 'UPDATE',
      resourceType: 'Order',
      resourceId: event.payload.orderId,
      actorId: event.actor,
      actorType: 'job',
      payload: event.payload,
      metadata: { timestamp: event.timestamp, trackingId: event.payload.trackingId },
    });
  },
};
