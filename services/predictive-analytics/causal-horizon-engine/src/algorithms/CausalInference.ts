import { CausalGraph } from '../models/CausalGraph.js';
import { combinations, powerSet } from '../utils/combinatorics.js';

export interface CausalEffect {
  intervention: string;
  outcome: string;
  effect: number;
  standardError: number;
  isIdentifiable: boolean;
  method: 'backdoor' | 'frontdoor' | 'iv' | 'none';
  adjustmentSet?: string[];
}

export interface IdentifiabilityResult {
  isIdentifiable: boolean;
  method?: string;
  adjustmentSet?: string[];
  explanation: string;
}

/**
 * Check if a causal effect P(Y|do(X)) is identifiable
 */
export function isIdentifiable(
  graph: CausalGraph,
  intervention: string,
  outcome: string
): IdentifiabilityResult {
  // Try backdoor criterion
  const backdoorSets = findBackdoorSets(graph, intervention, outcome);
  if (backdoorSets.length > 0) {
    return {
      isIdentifiable: true,
      method: 'backdoor',
      adjustmentSet: backdoorSets[0], // Return minimal set
      explanation: `Effect is identifiable via backdoor adjustment with set: {${backdoorSets[0].join(
        ', '
      )}}`,
    };
  }

  // Try frontdoor criterion
  const frontdoorSets = findFrontdoorSets(graph, intervention, outcome);
  if (frontdoorSets.length > 0) {
    return {
      isIdentifiable: true,
      method: 'frontdoor',
      adjustmentSet: frontdoorSets[0],
      explanation: `Effect is identifiable via frontdoor adjustment with mediator set: {${frontdoorSets[0].join(
        ', '
      )}}`,
    };
  }

  // Try do-calculus rules (simplified check)
  // In a full implementation, this would attempt to reduce P(Y|do(X)) to
  // an observational quantity using the three rules of do-calculus

  return {
    isIdentifiable: false,
    explanation: `Effect P(${outcome}|do(${intervention})) is not identifiable from observational data using standard criteria.`,
  };
}

/**
 * Find valid backdoor adjustment sets
 * Backdoor criterion (Pearl, 2009):
 * A set Z satisfies the backdoor criterion relative to (X, Y) if:
 * 1. No node in Z is a descendant of X
 * 2. Z blocks all backdoor paths from X to Y
 */
export function findBackdoorSets(
  graph: CausalGraph,
  x: string,
  y: string
): string[][] {
  const validSets: string[][] = [];

  // Get all ancestors of X and Y (excluding X and Y themselves)
  const ancestorsX = graph.getAncestors(x);
  const ancestorsY = graph.getAncestors(y);
  const ancestors = new Set([...ancestorsX, ...ancestorsY]);
  ancestors.delete(x);
  ancestors.delete(y);

  // Get descendants of X (these cannot be in the adjustment set)
  const descendantsX = graph.getDescendants(x);

  // Candidate nodes: ancestors that are not descendants of X
  const candidates = Array.from(ancestors).filter(
    (node) => !descendantsX.has(node)
  );

  // Test all subsets of candidates
  const subsets = powerSet(candidates);

  for (const subset of subsets) {
    if (isValidBackdoorSet(graph, x, y, subset)) {
      validSets.push(subset);
    }
  }

  // Sort by size (prefer minimal sets)
  validSets.sort((a, b) => a.length - b.length);

  return validSets;
}

/**
 * Check if a set Z is a valid backdoor adjustment set for (X, Y)
 */
function isValidBackdoorSet(
  graph: CausalGraph,
  x: string,
  y: string,
  z: string[]
): boolean {
  // Condition 1: No node in Z is a descendant of X
  const descendantsX = graph.getDescendants(x);
  for (const node of z) {
    if (descendantsX.has(node)) {
      return false;
    }
  }

  // Condition 2: Z blocks all backdoor paths from X to Y
  const backdoorPaths = findBackdoorPaths(graph, x, y);

  for (const path of backdoorPaths) {
    if (!isPathBlocked(graph, path, new Set(z))) {
      return false;
    }
  }

  return true;
}

/**
 * Find all backdoor paths from X to Y
 * A backdoor path is a path from X to Y that starts with an edge into X
 */
function findBackdoorPaths(
  graph: CausalGraph,
  x: string,
  y: string
): string[][] {
  const backdoorPaths: string[][] = [];

  // Get all parents of X (edges into X)
  const parentsX = graph.getParents(x);

  // For each parent, find undirected paths to Y
  for (const parent of parentsX) {
    const paths = findUndirectedPaths(graph, parent, y, [x]);
    for (const path of paths) {
      backdoorPaths.push([x, ...path]);
    }
  }

  return backdoorPaths;
}

/**
 * Find undirected paths (treating edges as bidirectional)
 */
function findUndirectedPaths(
  graph: CausalGraph,
  source: string,
  target: string,
  visited: string[]
): string[][] {
  if (source === target) {
    return [[source]];
  }

  const paths: string[][] = [];
  const newVisited = [...visited, source];

  // Get neighbors (both parents and children)
  const children = graph.getChildren(source);
  const parents = graph.getParents(source);
  const neighbors = [...children, ...parents];

  for (const neighbor of neighbors) {
    if (!newVisited.includes(neighbor)) {
      const subpaths = findUndirectedPaths(graph, neighbor, target, newVisited);
      for (const subpath of subpaths) {
        paths.push([source, ...subpath]);
      }
    }
  }

  return paths;
}

/**
 * Check if a path is blocked by conditioning on set Z (d-separation)
 */
function isPathBlocked(
  graph: CausalGraph,
  path: string[],
  conditionedSet: Set<string>
): boolean {
  // A path is blocked if there exists a node on the path that blocks it
  // Rules:
  // 1. Chain (A -> B -> C): blocked if B is conditioned on
  // 2. Fork (A <- B -> C): blocked if B is conditioned on
  // 3. Collider (A -> B <- C): blocked if B is NOT conditioned on
  //    (and no descendant of B is conditioned on)

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];

    const isCollider = isNodeCollider(graph, prev, current, next);

    if (isCollider) {
      // Collider: blocked unless current or descendant is conditioned on
      const descendants = graph.getDescendants(current);
      const hasConditionedDescendant = Array.from(descendants).some((d) =>
        conditionedSet.has(d)
      );

      if (!conditionedSet.has(current) && !hasConditionedDescendant) {
        return true; // Path is blocked
      }
    } else {
      // Chain or Fork: blocked if current is conditioned on
      if (conditionedSet.has(current)) {
        return true; // Path is blocked
      }
    }
  }

  return false; // Path is not blocked
}

/**
 * Check if a node is a collider on a path
 */
function isNodeCollider(
  graph: CausalGraph,
  prev: string,
  current: string,
  next: string
): boolean {
  // Collider: both edges point into current (prev -> current <- next)
  const hasEdgeFromPrev = graph.getChildren(prev).includes(current);
  const hasEdgeFromNext = graph.getChildren(next).includes(current);

  return hasEdgeFromPrev && hasEdgeFromNext;
}

/**
 * Find valid frontdoor adjustment sets
 * Frontdoor criterion (Pearl, 2009):
 * A set M satisfies the frontdoor criterion relative to (X, Y) if:
 * 1. M intercepts all directed paths from X to Y
 * 2. There is no backdoor path from X to M
 * 3. All backdoor paths from M to Y are blocked by X
 */
export function findFrontdoorSets(
  graph: CausalGraph,
  x: string,
  y: string
): string[][] {
  const validSets: string[][] = [];

  // Get all nodes on directed paths from X to Y
  const pathNodes = new Set<string>();
  const paths = graph.findAllPaths(x, y);

  for (const path of paths) {
    for (let i = 1; i < path.length - 1; i++) {
      pathNodes.add(path[i]);
    }
  }

  const candidates = Array.from(pathNodes);

  // Test all subsets
  const subsets = powerSet(candidates);

  for (const subset of subsets) {
    if (subset.length === 0) continue;
    if (isValidFrontdoorSet(graph, x, y, subset)) {
      validSets.push(subset);
    }
  }

  // Sort by size
  validSets.sort((a, b) => a.length - b.length);

  return validSets;
}

/**
 * Check if M is a valid frontdoor set
 */
function isValidFrontdoorSet(
  graph: CausalGraph,
  x: string,
  y: string,
  m: string[]
): boolean {
  // Condition 1: M intercepts all directed paths from X to Y
  const paths = graph.findAllPaths(x, y);
  for (const path of paths) {
    let intercepted = false;
    for (const node of m) {
      if (path.includes(node)) {
        intercepted = true;
        break;
      }
    }
    if (!intercepted) {
      return false;
    }
  }

  // Condition 2: No backdoor path from X to M
  for (const mediator of m) {
    const backdoorPaths = findBackdoorPaths(graph, x, mediator);
    if (backdoorPaths.length > 0) {
      return false;
    }
  }

  // Condition 3: X blocks all backdoor paths from M to Y
  for (const mediator of m) {
    const backdoorPaths = findBackdoorPaths(graph, mediator, y);
    for (const path of backdoorPaths) {
      if (!isPathBlocked(graph, path, new Set([x]))) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Compute causal effect using backdoor adjustment
 * P(Y|do(X)) = Σ_z P(Y|X,Z) P(Z)
 */
export function backdoorAdjustment(
  graph: CausalGraph,
  intervention: string,
  outcome: string,
  adjustmentSet: string[],
  data?: any[]
): CausalEffect {
  // In a real implementation, this would use observational data
  // For now, we'll use edge strengths as a proxy

  let effect = 0;
  let standardError = 0.1; // Placeholder

  // Compute effect as product of edge strengths along paths
  const paths = graph.findAllPaths(intervention, outcome);
  for (const path of paths) {
    let pathEffect = 1;
    for (let i = 0; i < path.length - 1; i++) {
      const edgeId = `${path[i]}->${path[i + 1]}`;
      const edge = graph.getEdge(edgeId);
      if (edge) {
        pathEffect *= edge.strength;
      }
    }
    effect += pathEffect;
  }

  return {
    intervention,
    outcome,
    effect,
    standardError,
    isIdentifiable: true,
    method: 'backdoor',
    adjustmentSet,
  };
}

/**
 * Compute causal effect using frontdoor adjustment
 * P(Y|do(X)) = Σ_m P(m|X) Σ_x' P(Y|m,x') P(x')
 */
export function frontdoorAdjustment(
  graph: CausalGraph,
  intervention: string,
  outcome: string,
  mediatorSet: string[],
  data?: any[]
): CausalEffect {
  // Simplified implementation using edge strengths
  let effect = 0;
  let standardError = 0.1;

  // Compute effect through mediators
  for (const mediator of mediatorSet) {
    const pathsXtoM = graph.findAllPaths(intervention, mediator);
    const pathsMtoY = graph.findAllPaths(mediator, outcome);

    for (const pathXM of pathsXtoM) {
      for (const pathMY of pathsMtoY) {
        let pathEffect = 1;

        // X -> M
        for (let i = 0; i < pathXM.length - 1; i++) {
          const edgeId = `${pathXM[i]}->${pathXM[i + 1]}`;
          const edge = graph.getEdge(edgeId);
          if (edge) pathEffect *= edge.strength;
        }

        // M -> Y
        for (let i = 0; i < pathMY.length - 1; i++) {
          const edgeId = `${pathMY[i]}->${pathMY[i + 1]}`;
          const edge = graph.getEdge(edgeId);
          if (edge) pathEffect *= edge.strength;
        }

        effect += pathEffect;
      }
    }
  }

  return {
    intervention,
    outcome,
    effect,
    standardError,
    isIdentifiable: true,
    method: 'frontdoor',
    adjustmentSet: mediatorSet,
  };
}
