import { EventEmitter } from 'events';
import type {
  DataLineage,
  LineageNode,
  LineageEdge,
  TransformationType
} from '../types.js';

/**
 * Lineage Tracker
 * Tracks data lineage and provenance through the ETL pipeline
 */
export class LineageTracker extends EventEmitter {
  private nodes: Map<string, LineageNode> = new Map();
  private edges: LineageEdge[] = [];
  private pipelineRunId: string;

  constructor(pipelineRunId: string) {
    super();
    this.pipelineRunId = pipelineRunId;
  }

  /**
   * Add a source node
   */
  addSourceNode(
    id: string,
    name: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): void {
    const node: LineageNode = {
      id,
      type: 'SOURCE',
      name,
      description,
      metadata
    };

    this.nodes.set(id, node);
    this.emit('node-added', node);
  }

  /**
   * Add a transformation node
   */
  addTransformationNode(
    id: string,
    name: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): void {
    const node: LineageNode = {
      id,
      type: 'TRANSFORMATION',
      name,
      description,
      metadata
    };

    this.nodes.set(id, node);
    this.emit('node-added', node);
  }

  /**
   * Add a destination node
   */
  addDestinationNode(
    id: string,
    name: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): void {
    const node: LineageNode = {
      id,
      type: 'DESTINATION',
      name,
      description,
      metadata
    };

    this.nodes.set(id, node);
    this.emit('node-added', node);
  }

  /**
   * Add an edge between nodes
   */
  addEdge(
    sourceId: string,
    targetId: string,
    transformationType?: TransformationType,
    recordCount?: number
  ): void {
    const edge: LineageEdge = {
      id: this.generateEdgeId(),
      sourceId,
      targetId,
      transformationType,
      recordCount,
      timestamp: new Date()
    };

    this.edges.push(edge);
    this.emit('edge-added', edge);
  }

  /**
   * Update edge record count
   */
  updateEdgeRecordCount(sourceId: string, targetId: string, recordCount: number): void {
    const edge = this.edges.find(
      (e) => e.sourceId === sourceId && e.targetId === targetId
    );

    if (edge) {
      edge.recordCount = recordCount;
      this.emit('edge-updated', edge);
    }
  }

  /**
   * Get lineage graph
   */
  getLineage(): DataLineage {
    return {
      pipelineRunId: this.pipelineRunId,
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      createdAt: new Date()
    };
  }

  /**
   * Get lineage as DOT format for visualization
   */
  toDot(): string {
    const lines: string[] = ['digraph lineage {'];

    // Add nodes
    for (const node of this.nodes.values()) {
      const shape = this.getNodeShape(node.type);
      const label = node.name;
      lines.push(`  "${node.id}" [shape=${shape}, label="${label}"];`);
    }

    // Add edges
    for (const edge of this.edges) {
      const label = edge.transformationType
        ? `[label="${edge.transformationType}${edge.recordCount ? ` (${edge.recordCount})` : ''}"]`
        : '';
      lines.push(`  "${edge.sourceId}" -> "${edge.targetId}" ${label};`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Get lineage as Mermaid format for visualization
   */
  toMermaid(): string {
    const lines: string[] = ['graph LR'];

    // Add nodes
    for (const node of this.nodes.values()) {
      const shape = this.getMermaidNodeShape(node.type);
      lines.push(`  ${node.id}${shape[0]}"${node.name}"${shape[1]}`);
    }

    // Add edges
    for (const edge of this.edges) {
      const label = edge.transformationType
        ? `|${edge.transformationType}${edge.recordCount ? ` (${edge.recordCount})` : ''}|`
        : '';
      lines.push(`  ${edge.sourceId} --${label}--> ${edge.targetId}`);
    }

    return lines.join('\n');
  }

  /**
   * Export lineage to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.getLineage(), null, 2);
  }

  /**
   * Reset lineage tracker
   */
  reset(): void {
    this.nodes.clear();
    this.edges = [];
    this.emit('reset');
  }

  /**
   * Get GraphViz node shape based on type
   */
  private getNodeShape(type: 'SOURCE' | 'TRANSFORMATION' | 'DESTINATION'): string {
    switch (type) {
      case 'SOURCE':
        return 'cylinder';
      case 'TRANSFORMATION':
        return 'box';
      case 'DESTINATION':
        return 'cylinder';
      default:
        return 'ellipse';
    }
  }

  /**
   * Get Mermaid node shape based on type
   */
  private getMermaidNodeShape(
    type: 'SOURCE' | 'TRANSFORMATION' | 'DESTINATION'
  ): [string, string] {
    switch (type) {
      case 'SOURCE':
        return ['[(', ')]'];
      case 'TRANSFORMATION':
        return ['[', ']'];
      case 'DESTINATION':
        return ['[(', ')]'];
      default:
        return ['(', ')'];
    }
  }

  /**
   * Generate unique edge ID
   */
  private generateEdgeId(): string {
    return `edge-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Provenance Record
 * Detailed record of data provenance
 */
export interface ProvenanceRecord {
  dataId: string;
  sourceSystem: string;
  sourceUrl?: string;
  ingestedAt: Date;
  transformations: Array<{
    name: string;
    type: TransformationType;
    timestamp: Date;
    parameters?: Record<string, unknown>;
    user?: string;
  }>;
  qualityChecks: Array<{
    checkName: string;
    passed: boolean;
    score?: number;
    timestamp: Date;
  }>;
  metadata: Record<string, unknown>;
}

/**
 * Provenance Tracker
 * Tracks detailed provenance for individual records
 */
export class ProvenanceTracker {
  private records: Map<string, ProvenanceRecord> = new Map();

  /**
   * Initialize provenance for a data record
   */
  initRecord(
    dataId: string,
    sourceSystem: string,
    sourceUrl?: string,
    metadata?: Record<string, unknown>
  ): void {
    const record: ProvenanceRecord = {
      dataId,
      sourceSystem,
      sourceUrl,
      ingestedAt: new Date(),
      transformations: [],
      qualityChecks: [],
      metadata: metadata || {}
    };

    this.records.set(dataId, record);
  }

  /**
   * Add transformation to provenance
   */
  addTransformation(
    dataId: string,
    name: string,
    type: TransformationType,
    parameters?: Record<string, unknown>,
    user?: string
  ): void {
    const record = this.records.get(dataId);

    if (record) {
      record.transformations.push({
        name,
        type,
        timestamp: new Date(),
        parameters,
        user
      });
    }
  }

  /**
   * Add quality check to provenance
   */
  addQualityCheck(
    dataId: string,
    checkName: string,
    passed: boolean,
    score?: number
  ): void {
    const record = this.records.get(dataId);

    if (record) {
      record.qualityChecks.push({
        checkName,
        passed,
        score,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get provenance record
   */
  getRecord(dataId: string): ProvenanceRecord | undefined {
    return this.records.get(dataId);
  }

  /**
   * Get all provenance records
   */
  getAllRecords(): ProvenanceRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Clear all provenance records
   */
  clear(): void {
    this.records.clear();
  }
}
