import client from 'prom-client';
import { Drift } from '../diff/compare.js';

export const graphParity = new client.Gauge({
  name: 'graph_parity',
  help: 'Matched/(matched+drift)',
  labelNames: ['scope'],
});

export const driftCounters = {
  drift_nodes_missing: new client.Counter({
    name: 'drift_nodes_missing',
    help: 'Missing nodes',
    labelNames: ['scope'],
  }),
  drift_nodes_extra: new client.Counter({
    name: 'drift_nodes_extra',
    help: 'Extra nodes',
    labelNames: ['scope'],
  }),
  drift_edges_missing: new client.Counter({
    name: 'drift_edges_missing',
    help: 'Missing edges',
    labelNames: ['scope'],
  }),
  drift_edges_extra: new client.Counter({
    name: 'drift_edges_extra',
    help: 'Extra edges',
    labelNames: ['scope'],
  }),
  drift_edges_mismatch: new client.Counter({
    name: 'drift_edges_mismatch',
    help: 'Mismatched edges',
    labelNames: ['scope'],
  }),
};

export function recordDrift(drift: Drift, scope = 'all') {
  graphParity.set({ scope }, drift.parity);
  driftCounters.drift_nodes_missing.inc({ scope }, drift.missingNodes.length);
  driftCounters.drift_nodes_extra.inc({ scope }, drift.extraNodes.length);
  driftCounters.drift_edges_missing.inc({ scope }, drift.missingEdges.length);
  driftCounters.drift_edges_extra.inc({ scope }, drift.extraEdges.length);
  driftCounters.drift_edges_mismatch.inc(
    { scope },
    drift.mismatchedEdges.length,
  );
}
