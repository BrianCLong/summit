/**
 * Temporal Innovation Graph Builder
 *
 * Fuses evidence events into time-versioned innovation graph snapshots.
 */

import type { InnovationGraph, InnovationNode, InnovationEdge, TemporalSnapshot, GraphDelta } from "../interfaces/innovation-graph.js";
import type { EvidenceRef } from "../interfaces/evidence.js";
import type { EvidenceEvent } from "../evidence-ingest/base-adapter.js";
import { aggregateConfidence } from "../interfaces/evidence.js";

/**
 * Graph Builder Configuration
 */
export interface GraphBuilderConfig {
  /**
   * Minimum confidence threshold for evidence (0.0-1.0)
   */
  minConfidence?: number;

  /**
   * Whether to auto-generate node IDs from assertions
   */
  autoGenerateNodeIds?: boolean;

  /**
   * Whether to auto-generate edge IDs
   */
  autoGenerateEdgeIds?: boolean;

  /**
   * Time window for grouping events into snapshots (milliseconds)
   */
  snapshotWindowMs?: number;
}

/**
 * Temporal Innovation Graph Builder
 */
export class TemporalGraphBuilder {
  private config: GraphBuilderConfig;
  private nodes: Map<string, InnovationNode> = new Map();
  private edges: Map<string, InnovationEdge> = new Map();
  private evidenceByNode: Map<string, Set<string>> = new Map();
  private evidenceByEdge: Map<string, Set<string>> = new Map();

  constructor(config: GraphBuilderConfig = {}) {
    this.config = {
      minConfidence: 0.5,
      autoGenerateNodeIds: true,
      autoGenerateEdgeIds: true,
      snapshotWindowMs: 24 * 60 * 60 * 1000, // 1 day default
      ...config,
    };
  }

  /**
   * Ingest evidence events and build/update graph
   */
  ingest(events: EvidenceEvent[]): void {
    for (const event of events) {
      // Filter by confidence
      if (event.confidence < (this.config.minConfidence || 0.5)) {
        continue;
      }

      // Process assertions
      for (const assertion of event.assertions) {
        this.processAssertion(assertion, event);
      }
    }
  }

  /**
   * Process a single assertion
   */
  private processAssertion(assertion: any, event: EvidenceEvent): void {
    const evidenceRef: EvidenceRef = {
      id: event.id,
      type: event.type,
      source: event.source,
      uri: event.uri,
      observedAt: event.observedAt,
      confidence: event.confidence,
      metadata: event.rawMetadata,
    };

    switch (assertion.type) {
      case "node_exists":
        this.ensureNode(assertion.subject, evidenceRef);
        break;

      case "edge_exists":
        if (assertion.predicate && assertion.object) {
          this.ensureEdge(
            assertion.subject,
            assertion.predicate,
            String(assertion.object),
            evidenceRef
          );
        }
        break;

      case "attribute_value":
        this.setNodeAttribute(
          assertion.subject,
          assertion.predicate || "unknown",
          assertion.object,
          evidenceRef
        );
        break;

      case "temporal_event":
        // Temporal events update node metadata
        this.ensureNode(assertion.subject, evidenceRef);
        const node = this.nodes.get(assertion.subject);
        if (node && assertion.predicate === "occurred_at") {
          node.firstSeenAt = node.firstSeenAt
            ? (node.firstSeenAt < String(assertion.object) ? node.firstSeenAt : String(assertion.object))
            : String(assertion.object);
          node.lastSeenAt = node.lastSeenAt
            ? (node.lastSeenAt > String(assertion.object) ? node.lastSeenAt : String(assertion.object))
            : String(assertion.object);
        }
        break;
    }
  }

  /**
   * Ensure node exists in graph
   */
  private ensureNode(nodeId: string, evidence: EvidenceRef): void {
    if (!this.nodes.has(nodeId)) {
      // Infer node type from ID or default to "technology"
      const type = this.inferNodeType(nodeId);

      this.nodes.set(nodeId, {
        id: nodeId,
        type,
        name: this.humanizeName(nodeId),
        attrs: {},
        evidenceRefs: [evidence],
      });

      this.evidenceByNode.set(nodeId, new Set([evidence.id]));
    } else {
      // Add evidence to existing node
      const node = this.nodes.get(nodeId)!;
      const evidenceIds = this.evidenceByNode.get(nodeId)!;

      if (!evidenceIds.has(evidence.id)) {
        node.evidenceRefs.push(evidence);
        evidenceIds.add(evidence.id);
      }
    }
  }

  /**
   * Ensure edge exists in graph
   */
  private ensureEdge(from: string, type: string, to: string, evidence: EvidenceRef): void {
    const edgeId = `${from}-${type}-${to}`;

    // Ensure nodes exist
    this.ensureNode(from, evidence);
    this.ensureNode(to, evidence);

    if (!this.edges.has(edgeId)) {
      // Map predicate to edge type
      const edgeType = this.mapPredicateToEdgeType(type);

      this.edges.set(edgeId, {
        id: edgeId,
        type: edgeType,
        from,
        to,
        evidenceRefs: [evidence],
      });

      this.evidenceByEdge.set(edgeId, new Set([evidence.id]));
    } else {
      // Add evidence to existing edge
      const edge = this.edges.get(edgeId)!;
      const evidenceIds = this.evidenceByEdge.get(edgeId)!;

      if (!evidenceIds.has(evidence.id)) {
        edge.evidenceRefs.push(evidence);
        evidenceIds.add(evidence.id);
      }
    }
  }

  /**
   * Set node attribute
   */
  private setNodeAttribute(nodeId: string, attribute: string, value: any, evidence: EvidenceRef): void {
    this.ensureNode(nodeId, evidence);
    const node = this.nodes.get(nodeId)!;
    node.attrs[attribute] = value;
  }

  /**
   * Build current graph snapshot
   */
  buildGraph(snapshotId: string = "current"): InnovationGraph {
    const now = new Date().toISOString();

    const graph: InnovationGraph = {
      metadata: {
        id: snapshotId,
        version: now,
        createdAt: now,
        description: "Innovation graph built from evidence fusion",
      },
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };

    // Add statistics
    graph.stats = this.calculateStats(graph);

    return graph;
  }

  /**
   * Build temporal snapshot
   */
  buildSnapshot(timestamp: string, snapshotId?: string): TemporalSnapshot {
    const id = snapshotId || `snapshot-${timestamp}`;
    const graph = this.buildGraph(id);

    return {
      id,
      timestamp,
      graph,
    };
  }

  /**
   * Calculate graph statistics
   */
  private calculateStats(graph: InnovationGraph): any {
    const nodeCountByType: Record<string, number> = {};
    const edgeCountByType: Record<string, number> = {};

    for (const node of graph.nodes) {
      nodeCountByType[node.type] = (nodeCountByType[node.type] || 0) + 1;
    }

    for (const edge of graph.edges) {
      edgeCountByType[edge.type] = (edgeCountByType[edge.type] || 0) + 1;
    }

    // Calculate total evidence and average confidence
    let totalEvidenceRefs = 0;
    let totalConfidence = 0;

    for (const node of graph.nodes) {
      totalEvidenceRefs += node.evidenceRefs.length;
      totalConfidence += aggregateConfidence(node.evidenceRefs);
    }

    for (const edge of graph.edges) {
      totalEvidenceRefs += edge.evidenceRefs.length;
      totalConfidence += aggregateConfidence(edge.evidenceRefs);
    }

    const avgConfidence = (graph.nodes.length + graph.edges.length) > 0
      ? totalConfidence / (graph.nodes.length + graph.edges.length)
      : 0;

    return {
      nodeCountByType,
      edgeCountByType,
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      totalEvidenceRefs,
      avgConfidence,
    };
  }

  /**
   * Infer node type from ID
   */
  private inferNodeType(nodeId: string): any {
    const lower = nodeId.toLowerCase();

    if (lower.includes("commit") || lower.includes("repo") || lower.includes("branch")) return "project";
    if (lower.includes("paper") || lower.includes("arxiv")) return "paper";
    if (lower.includes("org") || lower.includes("company")) return "organization";
    if (lower.includes("tech") || lower.includes("framework")) return "technology";
    if (lower.includes("tag") || lower.includes("release")) return "launch-event";

    return "technology"; // default
  }

  /**
   * Map predicate to edge type
   */
  private mapPredicateToEdgeType(predicate: string): any {
    const lower = predicate.toLowerCase();

    if (lower === "authors" || lower === "publishes") return "publishes";
    if (lower === "develops" || lower === "creates") return "develops";
    if (lower === "mentions" || lower === "uses") return "uses";
    if (lower === "builds-on" || lower === "depends-on") return "builds-on";
    if (lower === "implements") return "implements";

    return "uses"; // default
  }

  /**
   * Humanize node name from ID
   */
  private humanizeName(nodeId: string): string {
    return nodeId
      .replace(/^(tech|org|paper|commit|branch|tag)-/, "")
      .replace(/[-_]/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.evidenceByNode.clear();
    this.evidenceByEdge.clear();
  }

  /**
   * Get current node count
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get current edge count
   */
  getEdgeCount(): number {
    return this.edges.size;
  }
}
