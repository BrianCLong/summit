import { Drift } from '../diff/compare.js';

export type RepairAction =
  | {
      kind: 'UPSERT_NODE';
      type: string;
      id: string;
      labels: string[];
      props: Record<string, unknown>;
    }
  | { kind: 'DELETE_NODE'; type: string; id: string }
  | {
      kind: 'UPSERT_EDGE';
      fromType: string;
      fromId: string;
      rel: string;
      toType: string;
      toId: string;
    }
  | {
      kind: 'DELETE_EDGE';
      fromType: string;
      fromId: string;
      rel: string;
      toType: string;
      toId: string;
    };

export type RepairPlan = {
  actions: RepairAction[];
  summary: Record<string, number>;
};

export function planRepairs(
  drift: Drift,
  opts: { deleteExtras: boolean },
): RepairPlan {
  const actions: RepairAction[] = [];

  for (const node of drift.missingNodes) {
    actions.push({
      kind: 'UPSERT_NODE',
      type: node.type,
      id: node.id,
      labels: node.labels,
      props: node.props,
    });
  }
  for (const mismatch of drift.mismatchedNodes) {
    actions.push({
      kind: 'UPSERT_NODE',
      type: mismatch.pg.type,
      id: mismatch.pg.id,
      labels: mismatch.pg.labels,
      props: mismatch.pg.props,
    });
  }

  for (const edge of drift.missingEdges) {
    actions.push({
      kind: 'UPSERT_EDGE',
      fromType: edge.fromType,
      fromId: edge.fromId,
      rel: edge.rel,
      toType: edge.toType,
      toId: edge.toId,
    });
  }
  for (const mismatch of drift.mismatchedEdges) {
    actions.push({
      kind: 'UPSERT_EDGE',
      fromType: mismatch.pg.fromType,
      fromId: mismatch.pg.fromId,
      rel: mismatch.pg.rel,
      toType: mismatch.pg.toType,
      toId: mismatch.pg.toId,
    });
  }

  if (opts.deleteExtras) {
    for (const node of drift.extraNodes) {
      actions.push({ kind: 'DELETE_NODE', type: node.type, id: node.id });
    }
    for (const edge of drift.extraEdges) {
      actions.push({
        kind: 'DELETE_EDGE',
        fromType: edge.fromType,
        fromId: edge.fromId,
        rel: edge.rel,
        toType: edge.toType,
        toId: edge.toId,
      });
    }
  }

  const summary: Record<string, number> = {};
  for (const action of actions) {
    summary[action.kind] = (summary[action.kind] ?? 0) + 1;
  }

  return { actions, summary };
}
