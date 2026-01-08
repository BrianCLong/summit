/**
 * Context Replay Engine
 *
 * Reconstructs historical model contexts from provenance graphs
 * for audit, debugging, and "what-if" analysis.
 *
 * @see docs/adr/ADR-009_context_provenance_graph.md
 */

import { ProvenanceGraph, ProvenanceSnapshot, ContextSegment, ProvenanceQuery } from "./types.js";

/**
 * ReplayEngine
 *
 * Enables temporal reconstruction of context states from provenance graphs.
 */
export class ReplayEngine {
  /**
   * Reconstruct context as it existed at a specific timestamp
   */
  async replayAt(graph: ProvenanceGraph, timestamp: Date): Promise<ContextSegment[]> {
    const snapshot = graph.snapshot(timestamp);
    const activeSegments: ContextSegment[] = [];

    for (const segmentId of snapshot.activeSegments) {
      const node = graph.nodes.get(segmentId);
      if (node) {
        activeSegments.push(node.segment);
      }
    }

    // Sort by timestamp for chronological reconstruction
    activeSegments.sort((a, b) => a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime());

    return activeSegments;
  }

  /**
   * Replay with different policy rules ("what-if" analysis)
   */
  async replayWithPolicies(
    graph: ProvenanceGraph,
    timestamp: Date,
    policyFilter: (segment: ContextSegment) => boolean
  ): Promise<ContextSegment[]> {
    const baseSegments = await this.replayAt(graph, timestamp);
    return baseSegments.filter(policyFilter);
  }

  /**
   * Generate audit report for a specific query
   */
  async generateAuditReport(graph: ProvenanceGraph, query: ProvenanceQuery): Promise<AuditReport> {
    const segments = graph.query(query);

    // Group by agent
    const byAgent = new Map<string, ContextSegment[]>();
    for (const segment of segments) {
      const agentId = segment.metadata.sourceAgentId || "unknown";
      if (!byAgent.has(agentId)) {
        byAgent.set(agentId, []);
      }
      byAgent.get(agentId)!.push(segment);
    }

    // Group by trust tier
    const byTrustTier = new Map<string, ContextSegment[]>();
    for (const segment of segments) {
      const tier = segment.metadata.trustTier;
      if (!byTrustTier.has(tier)) {
        byTrustTier.set(tier, []);
      }
      byTrustTier.get(tier)!.push(segment);
    }

    // Find revoked segments
    const revokedSegments = segments.filter((s) => s.metadata.verificationStatus === "revoked");

    return {
      query,
      totalSegments: segments.length,
      segmentsByAgent: Object.fromEntries(byAgent.entries()),
      segmentsByTrustTier: Object.fromEntries(byTrustTier.entries()),
      revokedSegments,
      timeRange: {
        earliest: segments.reduce(
          (min, s) => (s.metadata.timestamp < min ? s.metadata.timestamp : min),
          segments[0]?.metadata.timestamp || new Date()
        ),
        latest: segments.reduce(
          (max, s) => (s.metadata.timestamp > max ? s.metadata.timestamp : max),
          segments[0]?.metadata.timestamp || new Date()
        ),
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Trace lineage of a specific segment back to root sources
   */
  async traceLineage(graph: ProvenanceGraph, segmentId: string): Promise<LineageTrace> {
    const node = graph.nodes.get(segmentId);
    if (!node) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    const ancestors: ContextSegment[] = [];
    const visited = new Set<string>();
    const queue: string[] = [segmentId];

    // BFS traversal of incoming edges
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentNode = graph.nodes.get(currentId);
      if (!currentNode) continue;

      if (currentId !== segmentId) {
        ancestors.push(currentNode.segment);
      }

      for (const edge of currentNode.incomingEdges) {
        if (edge.type === "DERIVED_FROM" && !visited.has(edge.from)) {
          queue.push(edge.from);
        }
      }
    }

    // Find root sources (segments with no incoming derivation edges)
    const roots = ancestors.filter((segment) => {
      const ancestorNode = graph.nodes.get(segment.id);
      return ancestorNode?.incomingEdges.every((e) => e.type !== "DERIVED_FROM") ?? false;
    });

    return {
      targetSegment: node.segment,
      ancestors,
      rootSources: roots,
      depth: ancestors.length,
      tracedAt: new Date(),
    };
  }

  /**
   * Compute diff between two snapshots
   */
  async diffSnapshots(
    snapshot1: ProvenanceSnapshot,
    snapshot2: ProvenanceSnapshot
  ): Promise<SnapshotDiff> {
    const added = new Set<string>();
    const removed = new Set<string>();
    const unchanged = new Set<string>();

    // Find added segments
    for (const segmentId of snapshot2.activeSegments) {
      if (!snapshot1.activeSegments.has(segmentId)) {
        added.add(segmentId);
      } else {
        unchanged.add(segmentId);
      }
    }

    // Find removed segments
    for (const segmentId of snapshot1.activeSegments) {
      if (!snapshot2.activeSegments.has(segmentId)) {
        removed.add(segmentId);
      }
    }

    return {
      snapshot1,
      snapshot2,
      addedSegments: Array.from(added),
      removedSegments: Array.from(removed),
      unchangedSegments: Array.from(unchanged),
      computedAt: new Date(),
    };
  }

  /**
   * Simulate revocation impact (dry-run)
   */
  async simulateRevocation(
    graph: ProvenanceGraph,
    segmentId: string,
    propagate: boolean
  ): Promise<RevocationSimulation> {
    const node = graph.nodes.get(segmentId);
    if (!node) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    const affectedSegments = [segmentId];

    if (propagate) {
      const descendants = this.getDescendants(graph, segmentId);
      affectedSegments.push(...descendants);
    }

    // Identify which sessions would be affected
    const affectedSessions = new Set<string>();
    if (graph.sessionId) {
      affectedSessions.add(graph.sessionId);
    }

    return {
      targetSegment: segmentId,
      wouldAffectSegments: affectedSegments,
      wouldAffectSessions: Array.from(affectedSessions),
      cascadeDepth: affectedSegments.length - 1,
      simulatedAt: new Date(),
    };
  }

  /**
   * Helper: Get all descendant segment IDs
   */
  private getDescendants(graph: ProvenanceGraph, nodeId: string): string[] {
    const descendants: string[] = [];
    const queue: string[] = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = graph.nodes.get(current);
      if (!node) continue;

      for (const edge of node.outgoingEdges) {
        if (!visited.has(edge.to)) {
          descendants.push(edge.to);
          queue.push(edge.to);
        }
      }
    }

    return descendants;
  }
}

/**
 * Audit report structure
 */
export interface AuditReport {
  query: ProvenanceQuery;
  totalSegments: number;
  segmentsByAgent: Record<string, ContextSegment[]>;
  segmentsByTrustTier: Record<string, ContextSegment[]>;
  revokedSegments: ContextSegment[];
  timeRange: {
    earliest: Date;
    latest: Date;
  };
  generatedAt: Date;
}

/**
 * Lineage trace structure
 */
export interface LineageTrace {
  targetSegment: ContextSegment;
  ancestors: ContextSegment[];
  rootSources: ContextSegment[];
  depth: number;
  tracedAt: Date;
}

/**
 * Snapshot diff structure
 */
export interface SnapshotDiff {
  snapshot1: ProvenanceSnapshot;
  snapshot2: ProvenanceSnapshot;
  addedSegments: string[];
  removedSegments: string[];
  unchangedSegments: string[];
  computedAt: Date;
}

/**
 * Revocation simulation result
 */
export interface RevocationSimulation {
  targetSegment: string;
  wouldAffectSegments: string[];
  wouldAffectSessions: string[];
  cascadeDepth: number;
  simulatedAt: Date;
}
