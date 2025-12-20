/**
 * Force-Directed Graph Layout
 *
 * Implements force-directed algorithms for graph visualization.
 * Nodes repel each other while edges act as springs, creating
 * natural-looking layouts that reveal community structure.
 *
 * @module layouts/force-directed
 */

export interface Node {
  id: string;
  x?: number;
  y?: number;
  mass?: number;
  fixed?: boolean;
}

export interface Edge {
  source: string;
  target: string;
  weight?: number;
}

export interface LayoutResult {
  nodes: Array<{ id: string; x: number; y: number }>;
  iterations: number;
  executionTime: number;
}

export interface ForceDirectedOptions {
  width?: number;
  height?: number;
  iterations?: number;
  repulsionStrength?: number;
  attractionStrength?: number;
  damping?: number;
  centeringForce?: number;
  timeStep?: number;
}

/**
 * Computes force-directed layout using Fruchterman-Reingold algorithm
 */
export function computeForceDirectedLayout(
  nodes: Node[],
  edges: Edge[],
  options: ForceDirectedOptions = {},
): LayoutResult {
  const startTime = performance.now();

  const {
    width = 1000,
    height = 1000,
    iterations = 100,
    repulsionStrength = 100,
    attractionStrength = 0.01,
    damping = 0.9,
    centeringForce = 0.01,
    timeStep = 1.0,
  } = options;

  // Initialize positions randomly if not set
  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();

  for (const node of nodes) {
    positions.set(node.id, {
      x: node.x ?? Math.random() * width,
      y: node.y ?? Math.random() * height,
      vx: 0,
      vy: 0,
    });
  }

  const centerX = width / 2;
  const centerY = height / 2;

  // Build edge map
  const edgeMap = new Map<string, Edge[]>();
  for (const edge of edges) {
    if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
    if (!edgeMap.has(edge.target)) edgeMap.set(edge.target, []);
    edgeMap.get(edge.source)!.push(edge);
    edgeMap.get(edge.target)!.push(edge);
  }

  // Simulation loop
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();

    // Initialize forces
    for (const node of nodes) {
      forces.set(node.id, { fx: 0, fy: 0 });
    }

    // Repulsive forces (all pairs)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        const posA = positions.get(nodeA.id)!;
        const posB = positions.get(nodeB.id)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distSq = dx * dx + dy * dy + 0.01; // avoid division by zero
        const dist = Math.sqrt(distSq);

        const force = (repulsionStrength * repulsionStrength) / distSq;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        forces.get(nodeA.id)!.fx -= fx;
        forces.get(nodeA.id)!.fy -= fy;
        forces.get(nodeB.id)!.fx += fx;
        forces.get(nodeB.id)!.fy += fy;
      }
    }

    // Attractive forces (edges)
    for (const edge of edges) {
      const posA = positions.get(edge.source);
      const posB = positions.get(edge.target);

      if (!posA || !posB) continue;

      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dist = Math.sqrt(dx * dx + dy * dy + 0.01);

      const weight = edge.weight || 1.0;
      const force = attractionStrength * weight * dist;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      forces.get(edge.source)!.fx += fx;
      forces.get(edge.source)!.fy += fy;
      forces.get(edge.target)!.fx -= fx;
      forces.get(edge.target)!.fy -= fy;
    }

    // Centering force
    for (const node of nodes) {
      const pos = positions.get(node.id)!;
      const force = forces.get(node.id)!;

      force.fx += (centerX - pos.x) * centeringForce;
      force.fy += (centerY - pos.y) * centeringForce;
    }

    // Update positions
    for (const node of nodes) {
      if (node.fixed) continue;

      const pos = positions.get(node.id)!;
      const force = forces.get(node.id)!;

      // Update velocity
      pos.vx = (pos.vx + force.fx * timeStep) * damping;
      pos.vy = (pos.vy + force.fy * timeStep) * damping;

      // Update position
      pos.x += pos.vx * timeStep;
      pos.y += pos.vy * timeStep;

      // Keep within bounds
      pos.x = Math.max(50, Math.min(width - 50, pos.x));
      pos.y = Math.max(50, Math.min(height - 50, pos.y));
    }
  }

  // Extract final positions
  const layoutNodes = nodes.map((node) => {
    const pos = positions.get(node.id)!;
    return { id: node.id, x: pos.x, y: pos.y };
  });

  const executionTime = performance.now() - startTime;

  return {
    nodes: layoutNodes,
    iterations,
    executionTime,
  };
}

/**
 * Hierarchical layout for tree-like structures
 */
export function computeHierarchicalLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    width?: number;
    height?: number;
    rootId?: string;
    levelSeparation?: number;
    nodeSeparation?: number;
  } = {},
): LayoutResult {
  const startTime = performance.now();

  const {
    width = 1000,
    height = 800,
    rootId,
    levelSeparation = 100,
    nodeSeparation = 50,
  } = options;

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find root (node with no incoming edges or specified root)
  let root = rootId;
  if (!root) {
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        root = nodeId;
        break;
      }
    }
  }

  if (!root) root = nodes[0]?.id;

  // BFS to assign levels
  const levels = new Map<string, number>();
  const queue: Array<{ id: string; level: number }> = [{ id: root, level: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);

    levels.set(id, level);

    const children = adjacency.get(id) || [];
    for (const child of children) {
      if (!visited.has(child)) {
        queue.push({ id: child, level: level + 1 });
      }
    }
  }

  // Group nodes by level
  const levelGroups = new Map<number, string[]>();
  for (const [nodeId, level] of levels) {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(nodeId);
  }

  // Assign positions
  const positions: Array<{ id: string; x: number; y: number }> = [];

  for (const [level, nodesInLevel] of levelGroups) {
    const y = level * levelSeparation + 50;
    const totalWidth = nodesInLevel.length * nodeSeparation;
    const startX = (width - totalWidth) / 2;

    nodesInLevel.forEach((nodeId, index) => {
      const x = startX + index * nodeSeparation + nodeSeparation / 2;
      positions.push({ id: nodeId, x, y });
    });
  }

  const executionTime = performance.now() - startTime;

  return {
    nodes: positions,
    iterations: 1,
    executionTime,
  };
}
