import React, { useMemo } from 'react';

type Node = { id: string; label?: string; durationMs?: number; cost?: number };
type Edge = { from: string; to: string };
type Graph = { nodes: Node[]; edges: Edge[] };
type Delta = {
  durationDeltaMs?: number;
  costDelta?: number;
  changed?: boolean;
  reason?: string;
};

type Props = {
  current: Graph;
  previous: Graph;
  nodeDeltas?: Record<string, Delta>;
};

/** Compute a simple critical path approximation based on durationMs. */
function criticalPathIds(g: Graph): string[] {
  const adj: Record<string, string[]> = {};
  const dur: Record<string, number> = {};
  g.nodes.forEach((n) => {
    dur[n.id] = n.durationMs || 0;
    adj[n.id] = [];
  });
  g.edges.forEach((e) => {
    (adj[e.from] ||= []).push(e.to);
  });
  const memo: Record<string, number> = {};
  const order = (id: string): number => {
    if (memo[id] != null) return memo[id];
    const children = adj[id] || [];
    const bestChild = Math.max(0, ...children.map(order));
    return (memo[id] = dur[id] + bestChild);
  };
  g.nodes.forEach((n) => order(n.id));
  // reconstruct a path by greedy choice
  const start = g.nodes.reduce(
    (a, b) => (order(a.id) > order(b.id) ? a : b),
    g.nodes[0],
  );
  const path: string[] = [];
  let cur = start?.id;
  const visited = new Set();
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    path.push(cur);
    const next = (adj[cur] || []).reduce(
      (best, nid) => (order(nid) > (best ? order(best) : -1) ? nid : best),
      '',
    );
    cur = next || undefined;
  }
  return path;
}

export default function GraphDiff({
  current,
  previous,
  nodeDeltas = {},
}: Props) {
  const cp = useMemo(() => criticalPathIds(current), [current]);
  const prevNodeMap = useMemo(
    () => Object.fromEntries(previous.nodes.map((n) => [n.id, n])),
    [previous],
  );

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Graph Differences</h2>
      <div className="text-sm text-gray-600">
        Critical path is highlighted; changed nodes show duration/cost deltas.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {current.nodes.map((n) => {
          const prev = prevNodeMap[n.id];
          const delta = nodeDeltas[n.id] || {};
          const changed =
            delta.changed ||
            !prev ||
            Math.round(n.durationMs || 0) !== Math.round(prev?.durationMs || 0);
          const onCp = cp.includes(n.id);
          return (
            <div
              key={n.id}
              className={`border rounded p-2 ${onCp ? 'ring-2 ring-indigo-500' : ''} ${changed ? 'bg-yellow-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm">{n.id}</div>
                {changed && (
                  <span className="text-xs text-amber-700">changed</span>
                )}
              </div>
              <div className="text-sm">
                <div>
                  Duration: {n.durationMs ?? 0} ms{' '}
                  {delta.durationDeltaMs != null ? (
                    <em>Δ {Math.round(delta.durationDeltaMs)} ms</em>
                  ) : null}
                </div>
                <div>
                  Cost: ${(n.cost ?? 0).toFixed?.(4) || (n.cost ?? 0)}{' '}
                  {delta.costDelta != null ? (
                    <em>Δ {delta.costDelta}</em>
                  ) : null}
                </div>
                {delta.reason && (
                  <div className="text-xs text-gray-600">
                    Reason: {delta.reason}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
