import { Counter } from 'prom-client';

export const streamingBatches = new Counter({
  name: 'streaming_dp_batches_total',
  help: 'Processed streaming DP batches'
});
