import { CausalGraph, CausalEdge, EdgeType } from '../models/CausalGraph.js';

export enum PathType {
  DIRECT = 'DIRECT',
  MEDIATED = 'MEDIATED',
  CONFOUNDED = 'CONFOUNDED',
  BLOCKED = 'BLOCKED',
}

export interface CausalPath {
  nodes: string[];
  edges: CausalEdge[];
  type: PathType;
  strength: number;
  contribution: number;
  isActive: boolean;
}

export interface PathAnalysis {
  source: string;
  target: string;
  directPaths: CausalPath[];
  indirectPaths: CausalPath[];
  totalEffect: number;
  directEffect: number;
  indirectEffect: number;
}

/**
 * Analyze all causal paths between source and target
 */
export function analyzeCausalPaths(
  graph: CausalGraph,
  source: string,
  target: string
): PathAnalysis {
  const allPaths = graph.findAllPaths(source, target);
  const causalPaths: CausalPath[] = [];

  for (const nodePath of allPaths) {
    const path = createCausalPath(graph, nodePath);
    causalPaths.push(path);
  }

  // Separate direct and indirect paths
  const directPaths = causalPaths.filter((p) => p.type === PathType.DIRECT);
  const indirectPaths = causalPaths.filter((p) => p.type === PathType.MEDIATED);

  // Calculate effects
  const totalEffect = causalPaths.reduce((sum, p) => sum + p.contribution, 0);
  const directEffect = directPaths.reduce((sum, p) => sum + p.contribution, 0);
  const indirectEffect = indirectPaths.reduce(
    (sum, p) => sum + p.contribution,
    0
  );

  return {
    source,
    target,
    directPaths,
    indirectPaths,
    totalEffect,
    directEffect,
    indirectEffect,
  };
}

/**
 * Create a CausalPath object from a node path
 */
function createCausalPath(graph: CausalGraph, nodePath: string[]): CausalPath {
  const edges: CausalEdge[] = [];
  let strength = 1;

  // Collect edges and calculate path strength
  for (let i = 0; i < nodePath.length - 1; i++) {
    const edgeId = `${nodePath[i]}->${nodePath[i + 1]}`;
    const edge = graph.getEdge(edgeId);

    if (edge) {
      edges.push(edge);
      strength *= edge.strength;
    } else {
      // Edge doesn't exist, path is invalid
      strength = 0;
    }
  }

  // Classify path type
  const type = classifyPath(nodePath, edges);

  // Determine if path is active (not blocked)
  const isActive = type !== PathType.BLOCKED;

  return {
    nodes: nodePath,
    edges,
    type,
    strength,
    contribution: isActive ? strength : 0,
    isActive,
  };
}

/**
 * Classify the type of causal path
 */
function classifyPath(nodePath: string[], edges: CausalEdge[]): PathType {
  // Direct path: only 2 nodes
  if (nodePath.length === 2) {
    return PathType.DIRECT;
  }

  // Check if path contains confounders or colliders
  let hasConfounder = false;
  let hasCollider = false;

  for (const edge of edges) {
    if (edge.type === EdgeType.CONFOUNDER) {
      hasConfounder = true;
    }
    if (edge.type === EdgeType.COLLIDER) {
      hasCollider = true;
    }
  }

  if (hasCollider) {
    return PathType.BLOCKED; // Colliders block paths by default
  }

  if (hasConfounder) {
    return PathType.CONFOUNDED;
  }

  // Otherwise, it's a mediated path
  return PathType.MEDIATED;
}

/**
 * Calculate path-specific effects
 * This decomposes total effect into contributions from each path
 */
export function calculatePathSpecificEffects(
  paths: CausalPath[]
): CausalPath[] {
  const totalStrength = paths.reduce(
    (sum, p) => sum + Math.abs(p.strength),
    0
  );

  if (totalStrength === 0) {
    return paths.map((p) => ({ ...p, contribution: 0 }));
  }

  // Normalize contributions
  return paths.map((p) => ({
    ...p,
    contribution: p.strength / totalStrength,
  }));
}

/**
 * Find mediators on paths between source and target
 */
export function findMediators(
  graph: CausalGraph,
  source: string,
  target: string
): string[] {
  const mediators = new Set<string>();
  const paths = graph.findAllPaths(source, target);

  for (const path of paths) {
    // Mediators are nodes in the middle of the path
    for (let i = 1; i < path.length - 1; i++) {
      mediators.add(path[i]);
    }
  }

  return Array.from(mediators);
}

/**
 * Find confounders between source and target
 * Confounders are common causes of both
 */
export function findConfounders(
  graph: CausalGraph,
  source: string,
  target: string
): string[] {
  const ancestorsSource = graph.getAncestors(source);
  const ancestorsTarget = graph.getAncestors(target);

  // Common ancestors are potential confounders
  const confounders: string[] = [];

  for (const ancestor of ancestorsSource) {
    if (ancestorsTarget.has(ancestor)) {
      confounders.push(ancestor);
    }
  }

  return confounders;
}

/**
 * Find colliders on paths between source and target
 * Collider: A node with two incoming edges on the path
 */
export function findColliders(
  graph: CausalGraph,
  source: string,
  target: string
): string[] {
  const colliders = new Set<string>();
  const paths = graph.findAllPaths(source, target);

  for (const path of paths) {
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const current = path[i];
      const next = path[i + 1];

      // Check if both edges point into current
      const hasEdgeFromPrev = graph.getChildren(prev).includes(current);
      const hasEdgeFromNext = graph.getChildren(next).includes(current);

      if (hasEdgeFromPrev && hasEdgeFromNext) {
        colliders.add(current);
      }
    }
  }

  return Array.from(colliders);
}

/**
 * Compute the direct effect (not mediated)
 */
export function computeDirectEffect(
  graph: CausalGraph,
  source: string,
  target: string
): number {
  const edgeId = `${source}->${target}`;
  const edge = graph.getEdge(edgeId);

  return edge ? edge.strength : 0;
}

/**
 * Compute the indirect effect (through mediators)
 */
export function computeIndirectEffect(
  graph: CausalGraph,
  source: string,
  target: string
): number {
  const analysis = analyzeCausalPaths(graph, source, target);
  return analysis.indirectEffect;
}

/**
 * Compute the total causal effect
 */
export function computeTotalEffect(
  graph: CausalGraph,
  source: string,
  target: string
): number {
  const analysis = analyzeCausalPaths(graph, source, target);
  return analysis.totalEffect;
}
