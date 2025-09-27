import * as client from 'prom-client';

export const zkdpProofLatency = new client.Histogram({
  name: 'zkdp_proof_latency_seconds',
  help: 'Latency of ZK proof generation',
  buckets: [1, 2, 5, 10, 20],
});

export const zkdpProofSize = new client.Gauge({
  name: 'zkdp_proof_size_bytes',
  help: 'Size of proof artifacts',
});

export const zkdpProofResult = new client.Counter({
  name: 'zkdp_proof_result_total',
  help: 'Count of proof verification results',
  labelNames: ['status'],
});
