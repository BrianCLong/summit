/**
 * @intelgraph/graph-synthesis
 * Graph and network synthesis
 */

export interface GraphNode {
  id: string;
  attributes?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
  attributes?: Record<string, any>;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: {
    directed: boolean;
    weighted: boolean;
    attributes?: string[];
  };
}

export interface GraphGenerationConfig {
  model: 'erdos-renyi' | 'barabasi-albert' | 'watts-strogatz' | 'community';
  numNodes: number;
  avgDegree?: number;
  directed?: boolean;
  weighted?: boolean;
}

export class GraphSynthesizer {
  constructor(private config: GraphGenerationConfig) {}

  async generate(): Promise<Graph> {
    switch (this.config.model) {
      case 'erdos-renyi':
        return this.generateErdosRenyi();
      case 'barabasi-albert':
        return this.generateBarabasiAlbert();
      case 'watts-strogatz':
        return this.generateWattsStrogatz();
      case 'community':
        return this.generateCommunityStructure();
      default:
        throw new Error(`Unknown model: ${this.config.model}`);
    }
  }

  private generateErdosRenyi(): Graph {
    const nodes = this.createNodes(this.config.numNodes);
    const edges: GraphEdge[] = [];

    const p = (this.config.avgDegree || 4) / this.config.numNodes;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() < p) {
          edges.push({
            source: nodes[i].id,
            target: nodes[j].id,
            weight: this.config.weighted ? Math.random() : undefined
          });
        }
      }
    }

    return { nodes, edges, metadata: { directed: false, weighted: this.config.weighted || false } };
  }

  private generateBarabasiAlbert(): Graph {
    const m = Math.floor((this.config.avgDegree || 4) / 2);
    const nodes = this.createNodes(this.config.numNodes);
    const edges: GraphEdge[] = [];
    const degrees = new Map<string, number>();

    // Initialize with small complete graph
    for (let i = 0; i < Math.min(m + 1, nodes.length); i++) {
      degrees.set(nodes[i].id, 0);
      for (let j = i + 1; j < Math.min(m + 1, nodes.length); j++) {
        edges.push({ source: nodes[i].id, target: nodes[j].id });
        degrees.set(nodes[i].id, (degrees.get(nodes[i].id) || 0) + 1);
        degrees.set(nodes[j].id, (degrees.get(nodes[j].id) || 0) + 1);
      }
    }

    // Add remaining nodes with preferential attachment
    for (let i = m + 1; i < nodes.length; i++) {
      degrees.set(nodes[i].id, 0);
      const targets = this.preferentialSelection(Array.from(degrees.keys()).slice(0, i), degrees, m);

      targets.forEach(target => {
        edges.push({ source: nodes[i].id, target });
        degrees.set(nodes[i].id, (degrees.get(nodes[i].id) || 0) + 1);
        degrees.set(target, (degrees.get(target) || 0) + 1);
      });
    }

    return { nodes, edges, metadata: { directed: false, weighted: false } };
  }

  private generateWattsStrogatz(): Graph {
    const k = this.config.avgDegree || 4;
    const nodes = this.createNodes(this.config.numNodes);
    const edges: GraphEdge[] = [];
    const p = 0.1; // Rewiring probability

    // Create ring lattice
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 1; j <= k / 2; j++) {
        const target = (i + j) % nodes.length;
        edges.push({ source: nodes[i].id, target: nodes[target].id });
      }
    }

    // Rewire edges
    const edgesCopy = [...edges];
    edgesCopy.forEach((edge, idx) => {
      if (Math.random() < p) {
        const newTarget = nodes[Math.floor(Math.random() * nodes.length)].id;
        edges[idx] = { source: edge.source, target: newTarget };
      }
    });

    return { nodes, edges, metadata: { directed: false, weighted: false } };
  }

  private generateCommunityStructure(): Graph {
    const numCommunities = Math.floor(this.config.numNodes / 20) || 3;
    const nodesPerCommunity = Math.floor(this.config.numNodes / numCommunities);

    const nodes = this.createNodes(this.config.numNodes);
    const edges: GraphEdge[] = [];

    // Assign nodes to communities
    nodes.forEach((node, idx) => {
      node.attributes = { community: Math.floor(idx / nodesPerCommunity) };
    });

    // Add intra-community edges (high probability)
    const pIntra = 0.3;
    const pInter = 0.01;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const sameCommunity = nodes[i].attributes!.community === nodes[j].attributes!.community;
        const p = sameCommunity ? pIntra : pInter;

        if (Math.random() < p) {
          edges.push({ source: nodes[i].id, target: nodes[j].id });
        }
      }
    }

    return { nodes, edges, metadata: { directed: false, weighted: false, attributes: ['community'] } };
  }

  private createNodes(n: number): GraphNode[] {
    return Array.from({ length: n }, (_, i) => ({ id: `node_${i}` }));
  }

  private preferentialSelection(candidates: string[], degrees: Map<string, number>, m: number): string[] {
    const totalDegree = Array.from(degrees.values()).reduce((a, b) => a + b, 0);
    const selected = new Set<string>();

    while (selected.size < m && selected.size < candidates.length) {
      let rand = Math.random() * totalDegree;

      for (const candidate of candidates) {
        if (selected.has(candidate)) continue;

        rand -= degrees.get(candidate) || 0;
        if (rand <= 0) {
          selected.add(candidate);
          break;
        }
      }
    }

    return Array.from(selected);
  }
}

export class TemporalGraphSynthesizer {
  async generateTemporalGraph(timestamps: number, graphPerTime: GraphGenerationConfig): Promise<Graph[]> {
    const synthesizer = new GraphSynthesizer(graphPerTime);
    return Promise.all(Array.from({ length: timestamps }, () => synthesizer.generate()));
  }
}
