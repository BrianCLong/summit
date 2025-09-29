import React from 'react';

export type DagNode = {
  id: string;
  label: string;
  state: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  retries?: number;
  compensated?: boolean;
};
export type DagEdge = { from: string; to: string };

function stateColor(s: DagNode['state']) {
  switch (s) {
    case 'running':
      return '#2563eb';
    case 'succeeded':
      return '#16a34a';
    case 'failed':
      return '#dc2626';
    case 'cancelled':
      return '#6b7280';
    default:
      return '#f59e0b';
  }
}

// Simple layered layout without external deps
export default function DAG({
  nodes,
  edges,
  onSelect,
}: {
  nodes: DagNode[];
  edges: DagEdge[];
  onSelect?: (id: string) => void;
}) {
  // Build adjacency and simple levels
  const levelMap = new Map<string, number>();
  const inputs = new Map<string, number>();
  nodes.forEach((n) => inputs.set(n.id, 0));
  edges.forEach((e) => inputs.set(e.to, (inputs.get(e.to) || 0) + 1));
  const q: string[] = nodes.filter((n) => (inputs.get(n.id) || 0) === 0).map((n) => n.id);
  q.forEach((id) => levelMap.set(id, 0));
  while (q.length) {
    const id = q.shift()!;
    const lvl = levelMap.get(id) || 0;
    edges
      .filter((e) => e.from === id)
      .forEach((e) => {
        const nextLvl = Math.max(lvl + 1, levelMap.get(e.to) ?? 0);
        if (!levelMap.has(e.to) || nextLvl > (levelMap.get(e.to) || 0)) {
          levelMap.set(e.to, nextLvl);
          q.push(e.to);
        }
      });
  }
  const byLevel: Record<number, string[]> = {} as any;
  nodes.forEach((n) => {
    const l = levelMap.get(n.id) ?? 0;
    byLevel[l] ||= [];
    byLevel[l].push(n.id);
  });
  const levels = Object.keys(byLevel)
    .map((k) => Number(k))
    .sort((a, b) => a - b);
  const width = Math.max(800, levels.length * 220);
  const laneH = 120;

  const pos = new Map<string, { x: number; y: number }>();
  levels.forEach((lvl, idx) => {
    const ids = byLevel[lvl];
    ids.forEach((id, i) => {
      pos.set(id, { x: 120 + idx * 200, y: 80 + i * laneH });
    });
  });

  return (
    <div className="overflow-auto rounded border bg-white">
      <svg width={width} height={Math.max(400, nodes.length * laneH)}>
        {/* edges */}
        {edges.map((e, i) => {
          const a = pos.get(e.from)!;
          const b = pos.get(e.to)!;
          const midX = (a.x + b.x) / 2;
          return (
            <path
              key={i}
              d={`M ${a.x + 60} ${a.y + 20} C ${midX} ${a.y + 20}, ${midX} ${b.y + 20}, ${b.x - 20} ${b.y + 20}`}
              stroke="#cbd5e1"
              fill="none"
              strokeWidth={2}
            />
          );
        })}
        {/* nodes */}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const color = stateColor(n.state);
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`}>
              <rect
                role="button"
                aria-label={`Node ${n.label} ${n.state}`}
                rx={8}
                width={140}
                height={48}
                fill={color}
                opacity={0.12}
                stroke={color}
                onClick={() => onSelect?.(n.id)}
              />
              <text x={10} y={22} fontSize={12} fill="#0f172a">
                {n.label}
              </text>
              <text x={10} y={38} fontSize={11} fill="#475569">
                {n.state}
              </text>
              {n?.retries ? (
                <g>
                  <rect x={100} y={6} rx={4} width={30} height={16} fill="#0f172a" opacity={0.06} />
                  <text x={104} y={18} fontSize={11} fill="#334155">
                    r{n.retries}
                  </text>
                </g>
              ) : null}
              {n?.compensated ? (
                <g>
                  <rect x={70} y={6} rx={4} width={24} height={16} fill="#dc2626" opacity={0.12} />
                  <text x={74} y={18} fontSize={11} fill="#b91c1c">
                    C
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
