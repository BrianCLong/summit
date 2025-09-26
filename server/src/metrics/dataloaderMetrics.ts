import { Counter, Histogram } from 'prom-client';
import { registry } from './registry.js';

const batchCounter = new Counter({
  name: 'graphql_dataloader_batch_total',
  help: 'Total number of batches executed by GraphQL DataLoaders',
  labelNames: ['loader'] as const,
  registers: [registry],
});

const batchSizeHistogram = new Histogram({
  name: 'graphql_dataloader_batch_size',
  help: 'Observed batch sizes for GraphQL DataLoaders',
  labelNames: ['loader'] as const,
  buckets: [1, 2, 5, 10, 20, 50, 100],
  registers: [registry],
});

export function observeDataloaderBatch(loader: string, size: number) {
  batchCounter.labels(loader).inc();
  batchSizeHistogram.labels(loader).observe(size);
}
