import { Counter, Histogram, register } from 'prom-client';

const DELIVERY_DURATION_NAME = 'webhook_delivery_duration_seconds';
const DELIVERY_TOTAL_NAME = 'webhook_delivery_total';

export const deliveryDuration =
  (register.getSingleMetric(DELIVERY_DURATION_NAME) as Histogram<string>) ||
  new Histogram({
    name: DELIVERY_DURATION_NAME,
    help: 'Webhook delivery latency in seconds',
    labelNames: ['event_type', 'outcome'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  });

export const deliveryTotal =
  (register.getSingleMetric(DELIVERY_TOTAL_NAME) as Counter<string>) ||
  new Counter({
    name: DELIVERY_TOTAL_NAME,
    help: 'Webhook delivery outcomes',
    labelNames: ['event_type', 'outcome'],
  });

export function recordDeliveryMetric(
  eventType: string,
  outcome: 'success' | 'failure' | 'poison',
  durationSeconds?: number,
) {
  deliveryTotal.inc({ event_type: eventType, outcome });
  if (durationSeconds !== undefined) {
    deliveryDuration.observe({ event_type: eventType, outcome }, durationSeconds);
  }
}
