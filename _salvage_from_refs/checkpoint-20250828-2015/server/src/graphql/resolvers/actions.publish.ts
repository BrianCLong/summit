import { publish } from '../../stream/kafka';

export async function emitEntity(e: any) {
  await publish('intelgraph.entities.v1', e.id, e);
}
export async function emitEdge(e: any) {
  await publish('intelgraph.edges.v1', `${e.src}->${e.dst}:${e.rel}`, e);
}
export async function emitAlert(a: any) {
  await publish('intelgraph.alerts.v1', a.id, a);
}
export async function emitLabel(l: any) {
  await publish('intelgraph.labels.v1', `${l.tenantId}:${l.suggestionId}`, l);
}
