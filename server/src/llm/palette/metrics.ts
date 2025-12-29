import { Counter, Histogram } from 'prom-client';

export const paletteUsedTotal = new Counter({
  name: 'palette_used_total',
  help: 'Total times a reasoning palette was applied',
  labelNames: ['paletteId'],
});

export const paletteSelectionLatency = new Histogram({
  name: 'palette_selection_latency_ms',
  help: 'Latency of palette selection in milliseconds',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

export const paletteCandidateHistogram = new Histogram({
  name: 'palette_k_candidates',
  help: 'Histogram of palette candidate counts when k>1',
  buckets: [1, 2, 3, 4, 5, 10],
});
