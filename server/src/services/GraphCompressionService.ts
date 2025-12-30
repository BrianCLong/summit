
interface GraphNode {
  id: string;
  label?: string;
  type?: string;
  [key: string]: any;
}

interface GraphLink {
  source: string;
  target: string;
  weight?: number;
  type?: string;
  [key: string]: any;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export class GraphCompressionService {
  /**
   * Compresses a graph by bundling dense clusters into supernodes.
   * Maintains evidence and provenance by aggregating properties.
   */
  public compress(data: GraphData): GraphData {
    if (!data.nodes.length || !data.links.length) {
      return data;
    }

    const communities = this.detectCommunities(data);
    return this.collapseCommunities(data, communities);
  }

  /**
   * Simple Label Propagation Algorithm (LPA) for community detection.
   * Deterministic enough for this use case with fixed random seed or simple tie-breaking.
   */
  private detectCommunities(data: GraphData): Map<string, string> {
    const adj = new Map<string, string[]>();

    // Build adjacency list
    data.nodes.forEach(n => adj.set(n.id, []));
    data.links.forEach(l => {
        // Handle both object and string source/target (Graph structure variability)
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;

        if (adj.has(s)) {adj.get(s)?.push(t);}
        if (adj.has(t)) {adj.get(t)?.push(s);}
    });

    // Initialize labels (each node is its own community)
    let labels = new Map<string, string>();
    data.nodes.forEach(n => labels.set(n.id, n.id));

    const iterations = 5; // Fast convergence usually

    for (let i = 0; i < iterations; i++) {
      const newLabels = new Map(labels);
      const nodes = [...data.nodes].sort(() => 0.5 - Math.random()); // Shuffle processing order

      for (const node of nodes) {
        const neighbors = adj.get(node.id) || [];
        if (neighbors.length === 0) {continue;}

        const labelCounts = new Map<string, number>();
        for (const neighbor of neighbors) {
            const l = labels.get(neighbor);
            if (l) {
                labelCounts.set(l, (labelCounts.get(l) || 0) + 1);
            }
        }

        // Find most frequent label
        let maxCount = -1;
        let bestLabels: string[] = [];

        for (const [label, count] of labelCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                bestLabels = [label];
            } else if (count === maxCount) {
                bestLabels.push(label);
            }
        }

        // Tie-breaking: prefer current label if it's one of the best, otherwise random or first
        if (bestLabels.length > 0) {
            if (bestLabels.includes(labels.get(node.id)!)) {
                // Keep current
            } else {
                newLabels.set(node.id, bestLabels[0]);
            }
        }
      }
      labels = newLabels;
    }

    return labels;
  }

  private collapseCommunities(data: GraphData, communities: Map<string, string>): GraphData {
    // Group nodes by community
    const clusterMap = new Map<string, GraphNode[]>();
    data.nodes.forEach(n => {
        const cId = communities.get(n.id) || n.id;
        if (!clusterMap.has(cId)) {clusterMap.set(cId, []);}
        clusterMap.get(cId)?.push(n);
    });

    const newNodes: GraphNode[] = [];
    const nodeMapping = new Map<string, string>(); // oldId -> newId

    // Create nodes (Supernodes or Singletons)
    for (const [cId, clusterNodes] of clusterMap.entries()) {
        if (clusterNodes.length > 1) {
            // Create Supernode
            const superId = `supernode-${cId}`; // Using cId which is usually one of the node IDs

            // Aggregate Properties
            const combinedLabel = `Cluster (${clusterNodes.length})`;
            const distinctTypes = new Set(clusterNodes.map(n => n.type).filter(Boolean));
            const primaryType = distinctTypes.size === 1 ? [...distinctTypes][0] : 'Cluster';

            // Aggregate Evidence & Provenance (simulated aggregation)
            const allEvidence = clusterNodes.flatMap(n => n.evidence || []);
            const allProvenance = clusterNodes.flatMap(n => n.provenance || []);

            // Calculate centroid for visual stability (optional, but helpful for UI)
            const avgX = clusterNodes.reduce((sum, n) => sum + (n.x || 0), 0) / clusterNodes.length;
            const avgY = clusterNodes.reduce((sum, n) => sum + (n.y || 0), 0) / clusterNodes.length;

            const superNode: GraphNode = {
                id: superId,
                label: combinedLabel,
                type: 'Supernode',
                originalType: primaryType, // Keep track
                isCluster: true,
                count: clusterNodes.length,
                evidence: [...new Set(allEvidence)], // De-dupe
                provenance: [...new Set(allProvenance)],
                memberIds: clusterNodes.map(n => n.id),
                x: avgX,
                y: avgY,
                val: clusterNodes.length * 2, // Visual size
            };

            newNodes.push(superNode);
            clusterNodes.forEach(n => nodeMapping.set(n.id, superId));
        } else {
            // Singleton - keep as is
            const node = clusterNodes[0];
            newNodes.push(node);
            nodeMapping.set(node.id, node.id);
        }
    }

    // Reconstruct Edges
    const newLinks: GraphLink[] = [];
    const linkKeys = new Set<string>();

    data.links.forEach(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;

        const newS = nodeMapping.get(s);
        const newT = nodeMapping.get(t);

        if (newS && newT && newS !== newT) {
            const key = `${newS}-${newT}`; // Directional
            if (!linkKeys.has(key)) {
                linkKeys.add(key);
                newLinks.push({
                    source: newS,
                    target: newT,
                    type: l.type || 'RELATED', // Or aggregate types
                    weight: (l.weight || 1), // Could sum weights of collapsed edges
                    isAggregated: true
                });
            } else {
                // If we were doing weighted, we'd find the existing link and increment weight
                // For now, simple existence
            }
        }
    });

    return { nodes: newNodes, links: newLinks };
  }
}

export const graphCompressionService = new GraphCompressionService();
