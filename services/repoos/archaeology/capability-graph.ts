/**
 * Capability Graph
 *
 * Tracks provenance and relationships across the archaeology pipeline:
 * - Fragments → Subsystems
 * - Subsystems → Deletions
 * - Deletions → Reconstructions
 * - Dependencies between capabilities
 * - Evolution timeline of each capability
 *
 * Provides graph queries for:
 * - "What capabilities depend on X?"
 * - "When was capability Y deleted?"
 * - "What is the provenance of reconstruction Z?"
 * - "Show me the evolution of subsystem W"
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CodeFragment } from './fragment-extractor.js';
import type { Subsystem } from './subsystem-inference.js';
import type { DeletionCandidate } from './partial-deletion-detector.js';
import type { ReconstructionBundle } from './reconstruction-engine.js';

export interface CapabilityNode {
  id: string;
  type: 'fragment' | 'subsystem' | 'deletion' | 'reconstruction';
  name: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CapabilityEdge {
  id: string;
  from: string; // Node ID
  to: string; // Node ID
  relation: EdgeRelation;
  weight?: number; // Strength of relationship (0-1)
  metadata?: Record<string, any>;
}

export type EdgeRelation =
  | 'contains' // Subsystem contains Fragment
  | 'depends_on' // Fragment depends on Fragment
  | 'deleted_as' // Fragment deleted as Deletion
  | 'reconstructed_from' // Reconstruction from Deletion
  | 'supersedes' // New code supersedes old
  | 'derives_from' // Derived from earlier version
  | 'co_changes_with'; // Changes together with

export interface CapabilityGraph {
  nodes: CapabilityNode[];
  edges: CapabilityEdge[];
  metadata: {
    created_at: string;
    repo_path: string;
    total_fragments: number;
    total_subsystems: number;
    total_deletions: number;
    total_reconstructions: number;
  };
}

export interface GraphQuery {
  type: 'dependencies' | 'dependents' | 'provenance' | 'evolution' | 'path';
  target: string; // Node ID or name
  max_depth?: number;
}

export interface GraphQueryResult {
  query: GraphQuery;
  nodes: CapabilityNode[];
  edges: CapabilityEdge[];
  metadata?: Record<string, any>;
}

export interface CapabilityGraphConfig {
  fragments_file: string;
  subsystems_file?: string;
  deletion_candidates_file?: string;
  reconstruction_bundles_file?: string;
  output_dir: string;
}

export class CapabilityGraphBuilder {
  private config: CapabilityGraphConfig;
  private graph: CapabilityGraph;
  private nodeIndex: Map<string, CapabilityNode>;
  private nameToNodeId: Map<string, string>;

  constructor(config: CapabilityGraphConfig) {
    this.config = config;
    this.graph = {
      nodes: [],
      edges: [],
      metadata: {
        created_at: new Date().toISOString(),
        repo_path: '',
        total_fragments: 0,
        total_subsystems: 0,
        total_deletions: 0,
        total_reconstructions: 0,
      },
    };
    this.nodeIndex = new Map();
    this.nameToNodeId = new Map();
  }

  /**
   * Build complete capability graph
   */
  async build(): Promise<CapabilityGraph> {
    console.log('Capability Graph: Building provenance graph...');

    // 1. Load and add fragments
    await this.addFragments();

    // 2. Load and add subsystems
    if (this.config.subsystems_file) {
      await this.addSubsystems();
    }

    // 3. Load and add deletions
    if (this.config.deletion_candidates_file) {
      await this.addDeletions();
    }

    // 4. Load and add reconstructions
    if (this.config.reconstruction_bundles_file) {
      await this.addReconstructions();
    }

    // 5. Add dependency edges
    await this.addDependencyEdges();

    // 6. Save graph
    await this.saveGraph();

    console.log(`Capability Graph complete:`);
    console.log(`  ${this.graph.nodes.length} nodes`);
    console.log(`  ${this.graph.edges.length} edges`);

    return this.graph;
  }

  /**
   * Add fragment nodes
   */
  private async addFragments(): Promise<void> {
    const data = await fs.readFile(this.config.fragments_file, 'utf8');
    const parsed = JSON.parse(data);
    const fragments: CodeFragment[] = parsed.fragments || [];

    for (const frag of fragments) {
      const node: CapabilityNode = {
        id: frag.id,
        type: 'fragment',
        name: frag.symbols[0]?.name || path.basename(frag.file_path),
        metadata: {
          file_path: frag.file_path,
          lines: frag.lines,
          commit_sha: frag.commit_sha,
          author: frag.author,
          complexity: frag.complexity_score,
          category: frag.category,
          is_deleted: !!frag.deletion_info,
        },
        created_at: frag.timestamp,
      };

      this.addNode(node);
    }

    this.graph.metadata.total_fragments = fragments.length;
    console.log(`  Added ${fragments.length} fragment nodes`);
  }

  /**
   * Add subsystem nodes and edges
   */
  private async addSubsystems(): Promise<void> {
    try {
      const data = await fs.readFile(this.config.subsystems_file!, 'utf8');
      const parsed = JSON.parse(data);
      const subsystems: Subsystem[] = parsed.subsystems || [];

      for (const subsystem of subsystems) {
        const node: CapabilityNode = {
          id: subsystem.id,
          type: 'subsystem',
          name: subsystem.name,
          metadata: {
            coherence_score: subsystem.coherence_score,
            confidence: subsystem.confidence,
            file_patterns: subsystem.file_patterns,
            characteristics: subsystem.characteristics,
          },
          created_at: new Date().toISOString(),
        };

        this.addNode(node);

        // Add "contains" edges from subsystem to fragments
        for (const fragId of subsystem.fragments) {
          this.addEdge({
            id: `${subsystem.id}_contains_${fragId}`,
            from: subsystem.id,
            to: fragId,
            relation: 'contains',
            weight: subsystem.coherence_score,
          });
        }
      }

      this.graph.metadata.total_subsystems = subsystems.length;
      console.log(`  Added ${subsystems.length} subsystem nodes`);
    } catch (error) {
      console.log('  No subsystems file found, skipping');
    }
  }

  /**
   * Add deletion nodes and edges
   */
  private async addDeletions(): Promise<void> {
    try {
      const data = await fs.readFile(this.config.deletion_candidates_file!, 'utf8');
      const parsed = JSON.parse(data);
      const candidates: DeletionCandidate[] = parsed.candidates || [];

      for (const candidate of candidates) {
        const node: CapabilityNode = {
          id: candidate.id,
          type: 'deletion',
          name: candidate.capability_name,
          metadata: {
            deletion_info: candidate.deletion_info,
            usage_evidence: candidate.usage_evidence,
            resurrection_assessment: candidate.resurrection_assessment,
            business_value: candidate.business_value,
            recommendation: candidate.recommendation,
          },
          created_at: candidate.deletion_info.deleted_at,
        };

        this.addNode(node);

        // Add "deleted_as" edges from fragments to deletion
        for (const fragId of candidate.deleted_fragments) {
          this.addEdge({
            id: `${fragId}_deleted_as_${candidate.id}`,
            from: fragId,
            to: candidate.id,
            relation: 'deleted_as',
            weight: candidate.business_value.value_score,
          });
        }
      }

      this.graph.metadata.total_deletions = candidates.length;
      console.log(`  Added ${candidates.length} deletion nodes`);
    } catch (error) {
      console.log('  No deletions file found, skipping');
    }
  }

  /**
   * Add reconstruction nodes and edges
   */
  private async addReconstructions(): Promise<void> {
    try {
      const data = await fs.readFile(this.config.reconstruction_bundles_file!, 'utf8');
      const parsed = JSON.parse(data);
      const bundles: ReconstructionBundle[] = parsed.bundles || [];

      for (const bundle of bundles) {
        const node: CapabilityNode = {
          id: bundle.bundle_id,
          type: 'reconstruction',
          name: bundle.capability_name,
          metadata: {
            synthesis_strategy: bundle.synthesis_strategy,
            confidence: bundle.confidence,
            target_paths: bundle.target_paths,
            provenance: bundle.provenance,
            validation: bundle.validation,
          },
          created_at: bundle.provenance.reconstructed_at,
        };

        this.addNode(node);

        // Add "reconstructed_from" edge from deletion to reconstruction
        this.addEdge({
          id: `${bundle.candidate_id}_reconstructed_as_${bundle.bundle_id}`,
          from: bundle.candidate_id,
          to: bundle.bundle_id,
          relation: 'reconstructed_from',
          weight: bundle.confidence,
        });
      }

      this.graph.metadata.total_reconstructions = bundles.length;
      console.log(`  Added ${bundles.length} reconstruction nodes`);
    } catch (error) {
      console.log('  No reconstructions file found, skipping');
    }
  }

  /**
   * Add dependency edges between fragments
   */
  private async addDependencyEdges(): Promise<void> {
    const data = await fs.readFile(this.config.fragments_file, 'utf8');
    const parsed = JSON.parse(data);
    const fragments: CodeFragment[] = parsed.fragments || [];

    let edgeCount = 0;

    for (const frag of fragments) {
      for (const dep of frag.dependencies) {
        // Find fragments that export this dependency
        const providers = fragments.filter((f) =>
          f.exported_symbols.some((sym) => dep.includes(sym))
        );

        for (const provider of providers) {
          if (provider.id !== frag.id) {
            this.addEdge({
              id: `${frag.id}_depends_on_${provider.id}`,
              from: frag.id,
              to: provider.id,
              relation: 'depends_on',
            });
            edgeCount++;
          }
        }
      }
    }

    console.log(`  Added ${edgeCount} dependency edges`);
  }

  /**
   * Add node to graph
   */
  private addNode(node: CapabilityNode): void {
    this.graph.nodes.push(node);
    this.nodeIndex.set(node.id, node);
    this.nameToNodeId.set(node.name, node.id);
  }

  /**
   * Add edge to graph
   */
  private addEdge(edge: CapabilityEdge): void {
    // Check if edge already exists
    const exists = this.graph.edges.some((e) => e.id === edge.id);
    if (!exists) {
      this.graph.edges.push(edge);
    }
  }

  /**
   * Save graph to disk
   */
  private async saveGraph(): Promise<void> {
    await fs.mkdir(this.config.output_dir, { recursive: true });

    const graphPath = path.join(this.config.output_dir, 'capability_graph.json');
    await fs.writeFile(graphPath, JSON.stringify(this.graph, null, 2));

    // Also save as DOT format for visualization
    const dotPath = path.join(this.config.output_dir, 'capability_graph.dot');
    const dotContent = this.toDOT();
    await fs.writeFile(dotPath, dotContent);

    console.log(`Capability graph saved to:`);
    console.log(`  JSON: ${graphPath}`);
    console.log(`  DOT: ${dotPath}`);
  }

  /**
   * Convert graph to DOT format for Graphviz
   */
  private toDOT(): string {
    let dot = 'digraph CapabilityGraph {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box, style=rounded];\n\n';

    // Node colors by type
    const nodeColors = {
      fragment: '#E3F2FD',
      subsystem: '#FFF3E0',
      deletion: '#FFEBEE',
      reconstruction: '#E8F5E9',
    };

    // Add nodes
    for (const node of this.graph.nodes) {
      const color = nodeColors[node.type];
      const label = node.name.replace(/"/g, '\\"');
      dot += `  "${node.id}" [label="${label}", fillcolor="${color}", style="filled,rounded"];\n`;
    }

    dot += '\n';

    // Edge styles by relation
    const edgeStyles: Record<EdgeRelation, string> = {
      contains: 'solid',
      depends_on: 'dashed',
      deleted_as: 'dotted',
      reconstructed_from: 'bold',
      supersedes: 'solid',
      derives_from: 'dashed',
      co_changes_with: 'dotted',
    };

    // Add edges
    for (const edge of this.graph.edges) {
      const style = edgeStyles[edge.relation] || 'solid';
      dot += `  "${edge.from}" -> "${edge.to}" [label="${edge.relation}", style="${style}"];\n`;
    }

    dot += '}\n';
    return dot;
  }

  /**
   * Query the graph
   */
  query(q: GraphQuery): GraphQueryResult {
    switch (q.type) {
      case 'dependencies':
        return this.queryDependencies(q);
      case 'dependents':
        return this.queryDependents(q);
      case 'provenance':
        return this.queryProvenance(q);
      case 'evolution':
        return this.queryEvolution(q);
      case 'path':
        return this.queryPath(q);
      default:
        throw new Error(`Unknown query type: ${q.type}`);
    }
  }

  /**
   * Query: What does X depend on?
   */
  private queryDependencies(q: GraphQuery): GraphQueryResult {
    const maxDepth = q.max_depth || 3;
    const visited = new Set<string>();
    const nodes: CapabilityNode[] = [];
    const edges: CapabilityEdge[] = [];

    const traverse = (nodeId: string, depth: number) => {
      if (depth > maxDepth || visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.nodeIndex.get(nodeId);
      if (node) {
        nodes.push(node);
      }

      // Find outgoing edges
      const outgoing = this.graph.edges.filter(
        (e) => e.from === nodeId && e.relation === 'depends_on'
      );

      for (const edge of outgoing) {
        edges.push(edge);
        traverse(edge.to, depth + 1);
      }
    };

    const startNodeId = this.nameToNodeId.get(q.target) || q.target;
    traverse(startNodeId, 0);

    return { query: q, nodes, edges };
  }

  /**
   * Query: What depends on X?
   */
  private queryDependents(q: GraphQuery): GraphQueryResult {
    const maxDepth = q.max_depth || 3;
    const visited = new Set<string>();
    const nodes: CapabilityNode[] = [];
    const edges: CapabilityEdge[] = [];

    const traverse = (nodeId: string, depth: number) => {
      if (depth > maxDepth || visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.nodeIndex.get(nodeId);
      if (node) {
        nodes.push(node);
      }

      // Find incoming edges
      const incoming = this.graph.edges.filter(
        (e) => e.to === nodeId && e.relation === 'depends_on'
      );

      for (const edge of incoming) {
        edges.push(edge);
        traverse(edge.from, depth + 1);
      }
    };

    const startNodeId = this.nameToNodeId.get(q.target) || q.target;
    traverse(startNodeId, 0);

    return { query: q, nodes, edges };
  }

  /**
   * Query: Provenance of X
   */
  private queryProvenance(q: GraphQuery): GraphQueryResult {
    const startNodeId = this.nameToNodeId.get(q.target) || q.target;
    const visited = new Set<string>();
    const nodes: CapabilityNode[] = [];
    const edges: CapabilityEdge[] = [];

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.nodeIndex.get(nodeId);
      if (node) {
        nodes.push(node);
      }

      // Follow provenance relations
      const provenanceEdges = this.graph.edges.filter(
        (e) =>
          e.to === nodeId &&
          (e.relation === 'reconstructed_from' ||
            e.relation === 'deleted_as' ||
            e.relation === 'derives_from')
      );

      for (const edge of provenanceEdges) {
        edges.push(edge);
        traverse(edge.from);
      }
    };

    traverse(startNodeId);

    return { query: q, nodes, edges };
  }

  /**
   * Query: Evolution timeline of X
   */
  private queryEvolution(q: GraphQuery): GraphQueryResult {
    const startNodeId = this.nameToNodeId.get(q.target) || q.target;
    const nodes: CapabilityNode[] = [];
    const edges: CapabilityEdge[] = [];

    // Find all related nodes through various relations
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.nodeIndex.get(nodeId);
      if (node) {
        nodes.push(node);
      }

      // Follow all temporal relations
      const related = this.graph.edges.filter(
        (e) => e.from === nodeId || e.to === nodeId
      );

      for (const edge of related) {
        edges.push(edge);
        const nextId = edge.from === nodeId ? edge.to : edge.from;
        traverse(nextId);
      }
    };

    traverse(startNodeId);

    // Sort nodes by creation time
    nodes.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return { query: q, nodes, edges };
  }

  /**
   * Query: Path between X and Y
   */
  private queryPath(q: GraphQuery): GraphQueryResult {
    const targets = q.target.split('->').map((t) => t.trim());
    if (targets.length !== 2) {
      throw new Error('Path query requires format: "node1 -> node2"');
    }

    const [start, end] = targets;
    const startId = this.nameToNodeId.get(start) || start;
    const endId = this.nameToNodeId.get(end) || end;

    const result = this.findShortestPath(startId, endId);

    return {
      query: q,
      nodes: result.nodes,
      edges: result.edges,
      metadata: { path_length: result.nodes.length - 1 },
    };
  }

  /**
   * Find shortest path using BFS
   */
  private findShortestPath(
    startId: string,
    endId: string
  ): { nodes: CapabilityNode[]; edges: CapabilityEdge[] } {
    const queue: Array<{ id: string; path: string[]; edges: CapabilityEdge[] }> = [
      { id: startId, path: [startId], edges: [] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.id === endId) {
        // Found path
        const nodes = current.path
          .map((id) => this.nodeIndex.get(id))
          .filter((n): n is CapabilityNode => n !== undefined);
        return { nodes, edges: current.edges };
      }

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      // Find outgoing edges
      const outgoing = this.graph.edges.filter((e) => e.from === current.id);

      for (const edge of outgoing) {
        queue.push({
          id: edge.to,
          path: [...current.path, edge.to],
          edges: [...current.edges, edge],
        });
      }
    }

    return { nodes: [], edges: [] }; // No path found
  }
}
