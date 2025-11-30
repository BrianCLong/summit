/**
 * CascadeMap - Represents a complete cascade of outcomes
 */

import type { LeveragePoint } from './LeveragePoint.js';
import type { OutcomeNode } from './OutcomeNode.js';

export interface PropagationPath {
  nodes: OutcomeNode[];
  probability: number;
  totalMagnitude: number;
  pathLength: number;
}

export interface CascadeMap {
  id: string;
  rootEvent: string;
  maxOrder: number;
  totalNodes: number;
  criticalPaths: PropagationPath[];
  leveragePoints: LeveragePoint[];
  amplificationFactor: number;
  createdAt: Date;
  metadata: Record<string, any>;
  nodes: OutcomeNode[];
}

export interface CascadeEdge {
  parentId: string;
  childId: string;
  strength: number;
  evidenceQuality: number;
}

export interface CascadeDAG {
  nodes: OutcomeNode[];
  edges: CascadeEdge[];
}

export class CascadeMapBuilder {
  private cascade: Partial<CascadeMap>;

  constructor(rootEvent: string, maxOrder: number) {
    this.cascade = {
      id: this.generateId(),
      rootEvent,
      maxOrder,
      totalNodes: 0,
      criticalPaths: [],
      leveragePoints: [],
      amplificationFactor: 1.0,
      createdAt: new Date(),
      metadata: {},
      nodes: [],
    };
  }

  withNodes(nodes: OutcomeNode[]): this {
    this.cascade.nodes = nodes;
    this.cascade.totalNodes = nodes.length;
    return this;
  }

  withCriticalPaths(paths: PropagationPath[]): this {
    this.cascade.criticalPaths = paths;
    return this;
  }

  withLeveragePoints(points: LeveragePoint[]): this {
    this.cascade.leveragePoints = points;
    return this;
  }

  withAmplificationFactor(factor: number): this {
    this.cascade.amplificationFactor = factor;
    return this;
  }

  withMetadata(metadata: Record<string, any>): this {
    this.cascade.metadata = { ...this.cascade.metadata, ...metadata };
    return this;
  }

  build(): CascadeMap {
    return this.cascade as CascadeMap;
  }

  private generateId(): string {
    return `cascade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function buildCascadeDAG(nodes: OutcomeNode[]): CascadeDAG {
  const edges: CascadeEdge[] = [];

  for (const node of nodes) {
    for (const childId of node.childNodes) {
      const child = nodes.find((n) => n.id === childId);
      if (!child) continue;

      edges.push({
        parentId: node.id,
        childId,
        strength: child.probability,
        evidenceQuality: child.evidenceStrength,
      });
    }
  }

  return { nodes, edges };
}

export function findNodeById(
  cascade: CascadeMap,
  nodeId: string,
): OutcomeNode | undefined {
  return cascade.nodes.find((n) => n.id === nodeId);
}

export function getNodesByOrder(
  cascade: CascadeMap,
  order: number,
): OutcomeNode[] {
  return cascade.nodes.filter((n) => n.order === order);
}

export function getRootNodes(cascade: CascadeMap): OutcomeNode[] {
  return cascade.nodes.filter((n) => n.order === 1);
}

export function getLeafNodes(cascade: CascadeMap): OutcomeNode[] {
  return cascade.nodes.filter((n) => n.childNodes.length === 0);
}

export function calculateTotalMagnitude(nodes: OutcomeNode[]): number {
  return nodes.reduce((sum, node) => sum + node.magnitude, 0);
}

export function calculateAmplification(
  nodes: OutcomeNode[],
  rootNode: OutcomeNode,
): number {
  const totalMagnitude = calculateTotalMagnitude(nodes);
  const rootMagnitude = rootNode.magnitude;

  return rootMagnitude > 0 ? totalMagnitude / rootMagnitude : 1.0;
}

export interface OrderAmplification {
  order: number;
  nodeCount: number;
  totalMagnitude: number;
  avgProbability: number;
}

export function getAmplificationByOrder(
  cascade: CascadeMap,
): OrderAmplification[] {
  const orders = new Map<number, OutcomeNode[]>();

  for (const node of cascade.nodes) {
    if (!orders.has(node.order)) {
      orders.set(node.order, []);
    }
    orders.get(node.order)!.push(node);
  }

  const result: OrderAmplification[] = [];

  for (const [order, nodes] of orders.entries()) {
    result.push({
      order,
      nodeCount: nodes.length,
      totalMagnitude: calculateTotalMagnitude(nodes),
      avgProbability:
        nodes.reduce((sum, n) => sum + n.probability, 0) / nodes.length,
    });
  }

  return result.sort((a, b) => a.order - b.order);
}
