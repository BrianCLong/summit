/**
 * Context Provenance Graph (CPG) - Core Implementation
 *
 * Directed acyclic graph for tracking context segment derivation,
 * transformation, and cryptographic integrity.
 *
 * @see docs/adr/ADR-009_context_provenance_graph.md
 */

import { createHash } from "crypto";
import {
  ProvenanceGraph as IProvenanceGraph,
  ProvenanceNode,
  ProvenanceEdge,
  ContextSegment,
  EdgeType,
  RevocationRequest,
  RevocationResult,
  ProvenanceQuery,
  ProvenanceSnapshot,
} from "./types.js";

/**
 * ProvenanceGraph
 *
 * Immutable, append-only graph representing context lineage.
 * Supports cryptographic verification, revocation, and historical replay.
 */
export class ProvenanceGraph implements IProvenanceGraph {
  public readonly id: string;
  public readonly nodes: Map<string, ProvenanceNode>;
  public readonly edges: ProvenanceEdge[];
  public readonly roots: Set<string>;
  public readonly createdAt: Date;
  public readonly sessionId?: string;

  constructor(id: string, sessionId?: string) {
    this.id = id;
    this.sessionId = sessionId;
    this.nodes = new Map();
    this.edges = [];
    this.roots = new Set();
    this.createdAt = new Date();
  }

  /**
   * Add a context segment as a new node in the graph
   */
  addSegment(segment: ContextSegment, parentIds?: string[]): ProvenanceNode {
    // Verify segment ID is cryptographically valid
    const computedId = this.computeSegmentHash(segment);
    if (segment.id !== computedId) {
      throw new Error(`Segment ID mismatch: expected ${computedId}, got ${segment.id}`);
    }

    // Create node
    const node: ProvenanceNode = {
      id: segment.id,
      segment,
      incomingEdges: [],
      outgoingEdges: [],
      revoked: false,
    };

    this.nodes.set(node.id, node);

    // Add derivation edges if parents specified
    if (parentIds && parentIds.length > 0) {
      for (const parentId of parentIds) {
        this.addEdge(parentId, node.id, "DERIVED_FROM", {
          derivedAt: new Date().toISOString(),
        });
      }
    } else {
      // No parents → root node
      this.roots.add(node.id);
    }

    return node;
  }

  /**
   * Add an edge between two nodes
   */
  addEdge(
    fromId: string,
    toId: string,
    type: EdgeType,
    metadata?: Record<string, unknown>
  ): ProvenanceEdge {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);

    if (!fromNode) {
      throw new Error(`Source node not found: ${fromId}`);
    }
    if (!toNode) {
      throw new Error(`Target node not found: ${toId}`);
    }

    const edge: ProvenanceEdge = {
      id: this.computeEdgeHash(fromId, toId, type),
      from: fromId,
      to: toId,
      type,
      metadata,
      timestamp: new Date(),
    };

    this.edges.push(edge);
    fromNode.outgoingEdges.push(edge);
    toNode.incomingEdges.push(edge);

    return edge;
  }

  /**
   * Revoke a segment and optionally propagate to descendants
   */
  revoke(request: RevocationRequest): RevocationResult {
    const node = this.nodes.get(request.segmentId);
    if (!node) {
      throw new Error(`Segment not found: ${request.segmentId}`);
    }

    const revokedSegments: string[] = [];
    const affectedSessions = new Set<string>();

    // Revoke the target segment
    this.revokeNode(node, request);
    revokedSegments.push(node.id);
    if (this.sessionId) {
      affectedSessions.add(this.sessionId);
    }

    // Propagate revocation transitively if requested
    if (request.propagate) {
      const descendants = this.getDescendants(request.segmentId);
      for (const descendantId of descendants) {
        const descendantNode = this.nodes.get(descendantId);
        if (descendantNode && !descendantNode.revoked) {
          this.revokeNode(descendantNode, request);
          revokedSegments.push(descendantId);
        }
      }
    }

    return {
      revokedSegments,
      cascadeCount: revokedSegments.length - 1, // Exclude the original segment
      affectedSessions: Array.from(affectedSessions),
      timestamp: request.timestamp || new Date(),
    };
  }

  /**
   * Get all descendant nodes (transitive closure of outgoing edges)
   */
  private getDescendants(nodeId: string): Set<string> {
    const descendants = new Set<string>();
    const queue: string[] = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = this.nodes.get(current);
      if (!node) continue;

      for (const edge of node.outgoingEdges) {
        if (!visited.has(edge.to)) {
          descendants.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    return descendants;
  }

  /**
   * Mark a node as revoked
   */
  private revokeNode(node: ProvenanceNode, request: RevocationRequest): void {
    node.revoked = true;
    node.revocationMetadata = {
      revokedAt: request.timestamp || new Date(),
      revokedBy: request.requestedBy,
      reason: request.reason,
    };

    // Add revocation edge for audit trail
    this.addEdge(node.id, node.id, "VIOLATES_INVARIANT", {
      revocationReason: request.reason,
      revokedBy: request.requestedBy,
    });
  }

  /**
   * Query the graph for segments matching criteria
   */
  query(params: ProvenanceQuery): ContextSegment[] {
    const results: ContextSegment[] = [];

    for (const node of this.nodes.values()) {
      // Skip revoked unless explicitly included
      if (node.revoked && !params.includeRevoked) {
        continue;
      }

      const segment = node.segment;

      // Filter by agent ID
      if (params.agentId && segment.metadata.sourceAgentId !== params.agentId) {
        continue;
      }

      // Filter by time range
      if (params.timeRange) {
        const timestamp = segment.metadata.timestamp;
        if (timestamp < params.timeRange.start || timestamp > params.timeRange.end) {
          continue;
        }
      }

      // Filter by trust tier
      if (params.trustTier && segment.metadata.trustTier !== params.trustTier) {
        continue;
      }

      // Filter by policy domain
      if (params.policyDomain && segment.metadata.policyDomain !== params.policyDomain) {
        continue;
      }

      results.push(segment);
    }

    return results;
  }

  /**
   * Create a snapshot of the graph at a specific timestamp
   */
  snapshot(timestamp: Date): ProvenanceSnapshot {
    const activeSegments = new Set<string>();

    // Find all segments that existed and were not revoked at this timestamp
    for (const node of this.nodes.values()) {
      const segmentTime = node.segment.metadata.timestamp;

      // Segment must have been created before snapshot time
      if (segmentTime > timestamp) {
        continue;
      }

      // Segment must not have been revoked before snapshot time
      if (node.revoked && node.revocationMetadata) {
        if (node.revocationMetadata.revokedAt <= timestamp) {
          continue;
        }
      }

      activeSegments.add(node.id);
    }

    return {
      id: `${this.id}-snapshot-${timestamp.getTime()}`,
      graph: this, // In production, this would be a deep clone
      timestamp,
      activeSegments,
    };
  }

  /**
   * Compute cryptographic hash of a segment (SHA-256)
   */
  private computeSegmentHash(segment: ContextSegment): string {
    const payload = JSON.stringify({
      type: segment.type,
      content: segment.content,
      metadata: {
        ...segment.metadata,
        // Exclude signature from hash computation
        signature: undefined,
      },
    });

    return createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Compute hash for an edge (deterministic ID)
   */
  private computeEdgeHash(from: string, to: string, type: EdgeType): string {
    const payload = `${from}-${type}-${to}`;
    return createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Verify cryptographic integrity of all nodes
   */
  verifyIntegrity(): boolean {
    for (const node of this.nodes.values()) {
      const computedHash = this.computeSegmentHash(node.segment);
      if (computedHash !== node.segment.id) {
        console.error(`Integrity violation: ${node.segment.id}`);
        return false;
      }

      // Verify parent hashes if present
      if (node.segment.metadata.parentHashes) {
        for (const parentHash of node.segment.metadata.parentHashes) {
          if (!this.nodes.has(parentHash)) {
            console.error(`Missing parent: ${parentHash}`);
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Export graph to JSON for persistence
   */
  toJSON(): object {
    return {
      id: this.id,
      sessionId: this.sessionId,
      createdAt: this.createdAt.toISOString(),
      nodes: Array.from(this.nodes.values()).map((node) => ({
        id: node.id,
        segment: node.segment,
        revoked: node.revoked,
        revocationMetadata: node.revocationMetadata,
      })),
      edges: this.edges.map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        type: edge.type,
        metadata: edge.metadata,
        timestamp: edge.timestamp.toISOString(),
      })),
      roots: Array.from(this.roots),
    };
  }
}

/**
 * Factory for creating segment IDs
 */
export function createSegmentId(
  type: string,
  content: string,
  metadata: Record<string, unknown>
): string {
  const payload = JSON.stringify({ type, content, metadata });
  return createHash("sha256").update(payload).digest("hex");
}
