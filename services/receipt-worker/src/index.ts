import { InMemoryQueue } from './queue/InMemoryQueue.js';
import { ReceiptWorker } from './ReceiptWorker.js';
import { ReceiptWorkerMetrics } from './metrics/metrics.js';
import { startMetricsServer } from './metrics/server.js';
import { ReceiptHandler, ReceiptJob, ReceiptWorkerConfig } from './types.js';

export {
  InMemoryQueue,
  ReceiptWorker,
  ReceiptWorkerMetrics,
  startMetricsServer,
  ReceiptHandler,
  ReceiptJob,
  ReceiptWorkerConfig,
};

export function createReceiptWorker<TPayload = unknown>({
  handler,
  config,
  metrics = new ReceiptWorkerMetrics(),
}: {
  handler: ReceiptHandler<TPayload>;
  config?: Partial<ReceiptWorkerConfig>;
  metrics?: ReceiptWorkerMetrics;
}): {
  worker: ReceiptWorker<TPayload>;
  queue: InMemoryQueue<TPayload>;
  deadLetterQueue: InMemoryQueue<TPayload>;
} {
  const queue = new InMemoryQueue<TPayload>();
  const deadLetterQueue = new InMemoryQueue<TPayload>();
  const worker = new ReceiptWorker<TPayload>({
    queue,
    deadLetterQueue,
    handler,
    metrics,
    config,
  });

  return { worker, queue, deadLetterQueue };
}
