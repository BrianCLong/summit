/**
 * CascadeSimulator - Build complete cascade maps from root events
 */

import type { OutcomeNodeInput } from '../models/OutcomeNode.js';
import {
  buildCascadeDAG,
  calculateAmplification,
  CascadeMapBuilder,
  type CascadeMap,
  type PropagationPath,
} from '../models/CascadeMap.js';
import type { GraphContext, PropagationOptions } from './PropagationEngine.js';
import { PropagationEngine } from './PropagationEngine.js';
import { LeverageIdentifier } from './LeverageIdentifier.js';

export interface SimulationOptions extends PropagationOptions {
  timeHorizon?: number;
  includeWeakLinks: boolean;
}

export interface PathCriteria {
  minProbability: number;
  minMagnitude: number;
  maxPathLength?: number;
}

export class CascadeSimulator {
  private propagationEngine: PropagationEngine;
  private leverageIdentifier: LeverageIdentifier;

  constructor() {
    this.propagationEngine = new PropagationEngine();
    this.leverageIdentifier = new LeverageIdentifier();
  }

  /**
   * Simulate complete cascade from root event
   */
  simulateCascade(
    rootEvent: OutcomeNodeInput,
    options: SimulationOptions,
    context: GraphContext,
  ): CascadeMap {
    // Phase 1: Generate outcome nodes through propagation
    const nodes = this.propagationEngine.propagateOutcomes(
      rootEvent,
      options,
      context,
    );

    if (nodes.length === 0) {
      throw new Error('No outcomes generated from root event');
    }

    // Phase 2: Build DAG structure
    const dag = buildCascadeDAG(nodes);

    // Phase 3: Identify critical paths
    const criticalPaths = this.findCriticalPaths(dag, {
      minProbability: options.probabilityThreshold,
      minMagnitude: options.magnitudeThreshold,
      maxPathLength: options.maxOrder,
    });

    // Phase 4: Calculate amplification factor
    const rootNode = nodes[0];
    const amplificationFactor = calculateAmplification(nodes, rootNode);

    // Phase 5: Find leverage points
    const leveragePoints = this.leverageIdentifier.identifyLeveragePoints(
      dag,
      criticalPaths,
    );

    // Build cascade map
    return new CascadeMapBuilder(rootEvent.description, options.maxOrder)
      .withNodes(nodes)
      .withCriticalPaths(criticalPaths)
      .withLeveragePoints(leveragePoints)
      .withAmplificationFactor(amplificationFactor)
      .withMetadata({
        options,
        simulatedAt: new Date().toISOString(),
      })
      .build();
  }

  /**
   * Find critical paths through the cascade
   */
  findCriticalPaths(
    dag: typeof import('../models/CascadeMap.js').CascadeDAG,
    criteria: PathCriteria,
  ): PropagationPath[] {
    const paths: PropagationPath[] = [];
    const rootNodes = dag.nodes.filter((n) => n.order === 1);

    for (const root of rootNodes) {
      this.traversePaths(root, [root], 1.0, 0, paths, criteria, dag);
    }

    // Rank by combined probability × magnitude
    return paths
      .sort(
        (a, b) =>
          b.probability * b.totalMagnitude - a.probability * a.totalMagnitude,
      )
      .slice(0, 20);
  }

  /**
   * Recursively traverse paths through DAG
   */
  private traversePaths(
    node: typeof import('../models/OutcomeNode.js').OutcomeNode,
    path: Array<typeof import('../models/OutcomeNode.js').OutcomeNode>,
    cumulativeProbability: number,
    cumulativeMagnitude: number,
    results: PropagationPath[],
    criteria: PathCriteria,
    dag: typeof import('../models/CascadeMap.js').CascadeDAG,
  ): void {
    const newProbability = cumulativeProbability * node.probability;
    const newMagnitude = cumulativeMagnitude + node.magnitude;

    // Prune low-probability paths
    if (newProbability < criteria.minProbability) return;

    // Check path length limit
    if (criteria.maxPathLength && path.length >= criteria.maxPathLength) {
      return;
    }

    // If leaf node, save path
    if (node.childNodes.length === 0) {
      if (newMagnitude >= criteria.minMagnitude) {
        results.push({
          nodes: [...path],
          probability: newProbability,
          totalMagnitude: newMagnitude,
          pathLength: path.length,
        });
      }
      return;
    }

    // Recurse to children
    for (const childId of node.childNodes) {
      const child = dag.nodes.find((n) => n.id === childId);
      if (!child) continue;

      // Prevent cycles (should not occur in DAG, but safety check)
      if (path.some((n) => n.id === child.id)) continue;

      this.traversePaths(
        child,
        [...path, child],
        newProbability,
        newMagnitude,
        results,
        criteria,
        dag,
      );
    }
  }

  /**
   * Find path from root to specific target node
   */
  findPathToNode(
    cascade: CascadeMap,
    targetNodeId: string,
  ): PropagationPath | null {
    const targetNode = cascade.nodes.find((n) => n.id === targetNodeId);
    if (!targetNode) return null;

    const rootNodes = cascade.nodes.filter((n) => n.order === 1);

    for (const root of rootNodes) {
      const path = this.findPathRecursive(
        root,
        targetNodeId,
        [root],
        cascade.nodes,
      );

      if (path) {
        return {
          nodes: path,
          probability: path.reduce((p, n) => p * n.probability, 1.0),
          totalMagnitude: path.reduce((m, n) => m + n.magnitude, 0),
          pathLength: path.length,
        };
      }
    }

    return null;
  }

  /**
   * Recursively find path to target node
   */
  private findPathRecursive(
    current: typeof import('../models/OutcomeNode.js').OutcomeNode,
    targetId: string,
    currentPath: Array<typeof import('../models/OutcomeNode.js').OutcomeNode>,
    allNodes: Array<typeof import('../models/OutcomeNode.js').OutcomeNode>,
  ): Array<typeof import('../models/OutcomeNode.js').OutcomeNode> | null {
    if (current.id === targetId) {
      return currentPath;
    }

    for (const childId of current.childNodes) {
      const child = allNodes.find((n) => n.id === childId);
      if (!child) continue;

      // Prevent cycles
      if (currentPath.some((n) => n.id === child.id)) continue;

      const path = this.findPathRecursive(
        child,
        targetId,
        [...currentPath, child],
        allNodes,
      );

      if (path) return path;
    }

    return null;
  }

  /**
   * Calculate path diversity (how many distinct paths exist)
   */
  calculatePathDiversity(cascade: CascadeMap): number {
    const dag = buildCascadeDAG(cascade.nodes);
    const allPaths = this.findCriticalPaths(dag, {
      minProbability: 0.01,
      minMagnitude: 0.01,
    });

    return allPaths.length;
  }

  /**
   * Find most likely outcome (highest probability path)
   */
  findMostLikelyOutcome(cascade: CascadeMap): PropagationPath | null {
    if (cascade.criticalPaths.length === 0) return null;

    return cascade.criticalPaths.reduce((max, path) =>
      path.probability > max.probability ? path : max,
    );
  }

  /**
   * Find highest impact outcome (highest magnitude path)
   */
  findHighestImpactOutcome(cascade: CascadeMap): PropagationPath | null {
    if (cascade.criticalPaths.length === 0) return null;

    return cascade.criticalPaths.reduce((max, path) =>
      path.totalMagnitude > max.totalMagnitude ? path : max,
    );
  }
}
