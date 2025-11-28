/**
 * OutcomeNode - Represents a single outcome in a cascade
 */

export interface OutcomeNode {
  id: string;
  event: string;
  order: number;
  probability: number;
  magnitude: number;
  timeDelay: number;
  domain: string;
  confidence: number;
  evidenceStrength: number;
  parentNodes: string[];
  childNodes: string[];
  createdAt: Date;
}

export interface OutcomeNodeInput {
  event: string;
  domain: string;
  initialMagnitude?: number;
  context?: Record<string, any>;
}

export class OutcomeNodeBuilder {
  private node: Partial<OutcomeNode>;

  constructor(event: string, order: number) {
    this.node = {
      id: this.generateId(),
      event,
      order,
      probability: 1.0,
      magnitude: 1.0,
      timeDelay: 0,
      domain: 'UNKNOWN',
      confidence: 0.5,
      evidenceStrength: 0.5,
      parentNodes: [],
      childNodes: [],
      createdAt: new Date(),
    };
  }

  withProbability(probability: number): this {
    this.node.probability = Math.max(0, Math.min(1, probability));
    return this;
  }

  withMagnitude(magnitude: number): this {
    this.node.magnitude = magnitude;
    return this;
  }

  withTimeDelay(timeDelay: number): this {
    this.node.timeDelay = timeDelay;
    return this;
  }

  withDomain(domain: string): this {
    this.node.domain = domain;
    return this;
  }

  withConfidence(confidence: number): this {
    this.node.confidence = Math.max(0, Math.min(1, confidence));
    return this;
  }

  withEvidenceStrength(evidenceStrength: number): this {
    this.node.evidenceStrength = Math.max(0, Math.min(1, evidenceStrength));
    return this;
  }

  withParents(parentIds: string[]): this {
    this.node.parentNodes = parentIds;
    return this;
  }

  withChildren(childIds: string[]): this {
    this.node.childNodes = childIds;
    return this;
  }

  build(): OutcomeNode {
    return this.node as OutcomeNode;
  }

  private generateId(): string {
    return `outcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createRootNode(input: OutcomeNodeInput): OutcomeNode {
  return new OutcomeNodeBuilder(input.event, 1)
    .withDomain(input.domain)
    .withMagnitude(input.initialMagnitude || 1.0)
    .withProbability(1.0)
    .withConfidence(0.9)
    .withEvidenceStrength(1.0)
    .build();
}

export function applyDampening(
  node: OutcomeNode,
  dampeningFactor: number,
): OutcomeNode {
  return {
    ...node,
    probability: node.probability * dampeningFactor,
    magnitude: node.magnitude * dampeningFactor,
    confidence: node.confidence * Math.sqrt(dampeningFactor),
  };
}

export function mergeOutcomeNodes(nodes: OutcomeNode[]): OutcomeNode[] {
  const nodeMap = new Map<string, OutcomeNode>();

  for (const node of nodes) {
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node);
    } else {
      // Merge duplicate nodes (take higher probability)
      const existing = nodeMap.get(node.id)!;
      if (node.probability > existing.probability) {
        nodeMap.set(node.id, node);
      }
    }
  }

  return Array.from(nodeMap.values());
}
