import * as client from 'prom-client';

export const replicationLag = new client.Gauge({
  name: 'maestro_replication_lag_seconds',
  help: 'peer lag seconds',
  labelNames: ['peer'],
});
export function setLag(peer: string, seconds: number) {
  replicationLag.labels(peer).set(seconds);
}
