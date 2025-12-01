/**
 * Evidence Chain Management
 *
 * Tracks the full chain of evidence from source to assertion to transform.
 */

import { createHash } from 'crypto';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface EvidenceNode {
  /** Unique node ID */
  id: string;
  /** Node type */
  type: 'source' | 'assertion' | 'transform' | 'inference' | 'verification';
  /** Content hash (SHA-256) */
  hash: string;
  /** Previous node hashes (for chain integrity) */
  parentHashes: string[];
  /** Bitemporal timestamps */
  temporal: {
    /** When this evidence was valid in the real world */
    validFrom: Date | null;
    validTo: Date | null;
    /** When this evidence was observed */
    observedAt: Date | null;
    /** When recorded in the system */
    recordedAt: Date;
  };
  /** Source attribution */
  source: {
    /** Source system identifier */
    sourceId: string;
    /** Source credibility (0-1) */
    credibility: number;
    /** Source type */
    sourceType: 'connector' | 'manual' | 'ai' | 'external' | 'derived';
  };
  /** Confidence in this evidence (0-1) */
  confidence: number;
  /** User who created this node */
  createdBy: string;
  /** Tenant ID */
  tenantId: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

export interface EvidenceChain {
  /** Chain ID */
  id: string;
  /** Root node hash */
  rootHash: string;
  /** All nodes in the chain */
  nodes: EvidenceNode[];
  /** Chain metadata */
  metadata: {
    createdAt: Date;
    lastUpdated: Date;
    nodeCount: number;
    maxDepth: number;
  };
}

export interface TransformStep {
  /** Step ID */
  stepId: string;
  /** Transform type */
  transformType: string;
  /** Input node hashes */
  inputs: string[];
  /** Output node hash */
  output: string;
  /** Transform parameters */
  parameters: Record<string, unknown>;
  /** Agent/user who performed transform */
  performedBy: string;
  /** When transform occurred */
  performedAt: Date;
}

// -----------------------------------------------------------------------------
// Evidence Chain Builder
// -----------------------------------------------------------------------------

export class EvidenceChainBuilder {
  private nodes: Map<string, EvidenceNode> = new Map();
  private transforms: TransformStep[] = [];
  private rootHash: string | null = null;

  /**
   * Add a source evidence node
   */
  addSource(
    content: string | Buffer,
    source: EvidenceNode['source'],
    options: {
      validFrom?: Date;
      observedAt?: Date;
      createdBy: string;
      tenantId: string;
      metadata?: Record<string, unknown>;
    }
  ): string {
    const hash = this.computeHash(content);
    const node: EvidenceNode = {
      id: this.generateId(),
      type: 'source',
      hash,
      parentHashes: [],
      temporal: {
        validFrom: options.validFrom || null,
        validTo: null,
        observedAt: options.observedAt || null,
        recordedAt: new Date(),
      },
      source,
      confidence: source.credibility,
      createdBy: options.createdBy,
      tenantId: options.tenantId,
      metadata: options.metadata || {},
    };

    this.nodes.set(hash, node);
    if (!this.rootHash) {
      this.rootHash = hash;
    }
    return hash;
  }

  /**
   * Add an assertion derived from sources
   */
  addAssertion(
    content: string,
    parentHashes: string[],
    options: {
      confidence: number;
      createdBy: string;
      tenantId: string;
      sourceType?: EvidenceNode['source']['sourceType'];
      metadata?: Record<string, unknown>;
    }
  ): string {
    const hash = this.computeHash(content);
    const node: EvidenceNode = {
      id: this.generateId(),
      type: 'assertion',
      hash,
      parentHashes,
      temporal: {
        validFrom: null,
        validTo: null,
        observedAt: new Date(),
        recordedAt: new Date(),
      },
      source: {
        sourceId: 'derived',
        credibility: options.confidence,
        sourceType: options.sourceType || 'derived',
      },
      confidence: options.confidence,
      createdBy: options.createdBy,
      tenantId: options.tenantId,
      metadata: options.metadata || {},
    };

    this.nodes.set(hash, node);
    return hash;
  }

  /**
   * Add a transform step
   */
  addTransform(
    transformType: string,
    inputHashes: string[],
    outputContent: string,
    options: {
      parameters: Record<string, unknown>;
      performedBy: string;
      tenantId: string;
      confidence?: number;
    }
  ): string {
    const outputHash = this.computeHash(outputContent);

    // Create transform node
    const node: EvidenceNode = {
      id: this.generateId(),
      type: 'transform',
      hash: outputHash,
      parentHashes: inputHashes,
      temporal: {
        validFrom: null,
        validTo: null,
        observedAt: new Date(),
        recordedAt: new Date(),
      },
      source: {
        sourceId: transformType,
        credibility: options.confidence || 1.0,
        sourceType: 'derived',
      },
      confidence: options.confidence || 1.0,
      createdBy: options.performedBy,
      tenantId: options.tenantId,
      metadata: { transformType, parameters: options.parameters },
    };

    this.nodes.set(outputHash, node);

    // Record transform step
    this.transforms.push({
      stepId: this.generateId(),
      transformType,
      inputs: inputHashes,
      output: outputHash,
      parameters: options.parameters,
      performedBy: options.performedBy,
      performedAt: new Date(),
    });

    return outputHash;
  }

  /**
   * Add an AI inference node
   */
  addInference(
    content: string,
    parentHashes: string[],
    options: {
      modelId: string;
      modelVersion: string;
      confidence: number;
      createdBy: string;
      tenantId: string;
      prompt?: string;
      temperature?: number;
    }
  ): string {
    const hash = this.computeHash(content);
    const node: EvidenceNode = {
      id: this.generateId(),
      type: 'inference',
      hash,
      parentHashes,
      temporal: {
        validFrom: null,
        validTo: null,
        observedAt: new Date(),
        recordedAt: new Date(),
      },
      source: {
        sourceId: `ai:${options.modelId}:${options.modelVersion}`,
        credibility: options.confidence,
        sourceType: 'ai',
      },
      confidence: options.confidence,
      createdBy: options.createdBy,
      tenantId: options.tenantId,
      metadata: {
        modelId: options.modelId,
        modelVersion: options.modelVersion,
        prompt: options.prompt,
        temperature: options.temperature,
      },
    };

    this.nodes.set(hash, node);
    return hash;
  }

  /**
   * Build the evidence chain
   */
  build(): EvidenceChain {
    if (!this.rootHash) {
      throw new Error('No nodes in evidence chain');
    }

    const nodes = Array.from(this.nodes.values());
    const maxDepth = this.computeMaxDepth();

    return {
      id: this.generateId(),
      rootHash: this.rootHash,
      nodes,
      metadata: {
        createdAt: new Date(),
        lastUpdated: new Date(),
        nodeCount: nodes.length,
        maxDepth,
      },
    };
  }

  /**
   * Compute hash of content
   */
  private computeHash(content: string | Buffer): string {
    return createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Compute maximum chain depth
   */
  private computeMaxDepth(): number {
    const depths = new Map<string, number>();

    for (const node of this.nodes.values()) {
      if (node.parentHashes.length === 0) {
        depths.set(node.hash, 0);
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (const node of this.nodes.values()) {
        if (depths.has(node.hash)) continue;

        const parentDepths = node.parentHashes
          .map((h) => depths.get(h))
          .filter((d) => d !== undefined) as number[];

        if (parentDepths.length === node.parentHashes.length) {
          depths.set(node.hash, Math.max(...parentDepths) + 1);
          changed = true;
        }
      }
    }

    return Math.max(...depths.values(), 0);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ev_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// -----------------------------------------------------------------------------
// Chain Verification
// -----------------------------------------------------------------------------

export class EvidenceChainVerifier {
  /**
   * Verify integrity of an evidence chain
   */
  verify(chain: EvidenceChain): VerificationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check root exists
    const rootNode = chain.nodes.find((n) => n.hash === chain.rootHash);
    if (!rootNode) {
      errors.push('Root node not found in chain');
    }

    // Verify all parent references
    const nodeHashes = new Set(chain.nodes.map((n) => n.hash));
    for (const node of chain.nodes) {
      for (const parentHash of node.parentHashes) {
        if (!nodeHashes.has(parentHash)) {
          errors.push(`Node ${node.id} references missing parent ${parentHash}`);
        }
      }
    }

    // Check for cycles
    if (this.hasCycles(chain)) {
      errors.push('Evidence chain contains cycles');
    }

    // Verify temporal consistency
    for (const node of chain.nodes) {
      if (node.temporal.validFrom && node.temporal.validTo) {
        if (node.temporal.validFrom > node.temporal.validTo) {
          errors.push(`Node ${node.id} has invalid temporal range`);
        }
      }
      if (node.temporal.observedAt && node.temporal.observedAt > node.temporal.recordedAt) {
        warnings.push(`Node ${node.id} was observed after recording`);
      }
    }

    // Check confidence propagation
    for (const node of chain.nodes) {
      if (node.parentHashes.length > 0) {
        const parentConfidences = node.parentHashes
          .map((h) => chain.nodes.find((n) => n.hash === h)?.confidence || 0);
        const maxParentConfidence = Math.max(...parentConfidences);
        if (node.confidence > maxParentConfidence) {
          warnings.push(`Node ${node.id} has higher confidence than parents`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      nodeCount: chain.nodes.length,
      maxDepth: chain.metadata.maxDepth,
    };
  }

  /**
   * Check for cycles in the chain
   */
  private hasCycles(chain: EvidenceChain): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (hash: string): boolean => {
      visited.add(hash);
      recursionStack.add(hash);

      const node = chain.nodes.find((n) => n.hash === hash);
      if (node) {
        for (const parentHash of node.parentHashes) {
          if (!visited.has(parentHash)) {
            if (dfs(parentHash)) return true;
          } else if (recursionStack.has(parentHash)) {
            return true;
          }
        }
      }

      recursionStack.delete(hash);
      return false;
    };

    for (const node of chain.nodes) {
      if (!visited.has(node.hash)) {
        if (dfs(node.hash)) return true;
      }
    }

    return false;
  }
}

export interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  nodeCount: number;
  maxDepth: number;
}
