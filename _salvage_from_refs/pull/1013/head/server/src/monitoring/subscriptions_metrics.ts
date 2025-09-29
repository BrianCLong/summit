import { Counter, Gauge, Histogram } from 'prom-client';

export const subscriptionQueueDepth = new Gauge({
  name: 'subscription_queue_depth',
  help: 'Number of pending subscription events'
});

export const subscriptionDrops = new Counter({
  name: 'subscription_drops_total',
  help: 'Count of dropped subscription events'
});

export const subscriptionLatency = new Histogram({
  name: 'subscription_latency_ms',
  help: 'Subscription processing latency in ms',
  buckets: [50, 100, 200, 300, 500, 1000]
});
