/**
 * Graph export utilities for various formats
 */

import { GraphNode, GraphEdge } from '../types.js';

export interface ExportOptions {
  format: 'json' | 'csv' | 'graphml' | 'gexf' | 'cytoscape';
  includeMetadata?: boolean;
  prettyPrint?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: Record<string, any>;
}

export class GraphExporter {
  /**
   * Export graph to JSON format
   */
  static toJSON(data: GraphData, options: { prettyPrint?: boolean } = {}): string {
    const exported = {
      nodes: data.nodes.map(n => ({
        id: n.id,
        type: n.type,
        labels: n.labels,
        properties: n.properties,
        ...(options.prettyPrint ? { metadata: n.metadata } : {})
      })),
      edges: data.edges.map(e => ({
        source: e.from,
        target: e.to,
        type: e.type,
        properties: e.properties,
        weight: e.weight
      })),
      metadata: data.metadata
    };

    return options.prettyPrint
      ? JSON.stringify(exported, null, 2)
      : JSON.stringify(exported);
  }

  /**
   * Export graph to CSV format (nodes and edges as separate outputs)
   */
  static toCSV(data: GraphData): { nodes: string; edges: string } {
    // Nodes CSV
    const nodeHeaders = ['id', 'type', 'labels', 'properties'];
    const nodeRows = data.nodes.map(n => [
      n.id,
      n.type,
      n.labels?.join(';') || '',
      JSON.stringify(n.properties)
    ]);
    const nodesCSV = [nodeHeaders.join(','), ...nodeRows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

    // Edges CSV
    const edgeHeaders = ['source', 'target', 'type', 'weight', 'properties'];
    const edgeRows = data.edges.map(e => [
      e.from,
      e.to,
      e.type,
      e.weight?.toString() || '1',
      JSON.stringify(e.properties || {})
    ]);
    const edgesCSV = [edgeHeaders.join(','), ...edgeRows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

    return { nodes: nodesCSV, edges: edgesCSV };
  }

  /**
   * Export to GraphML format
   */
  static toGraphML(data: GraphData): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
      '  <key id="label" for="node" attr.name="label" attr.type="string"/>',
      '  <key id="type" for="node" attr.name="type" attr.type="string"/>',
      '  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>',
      '  <graph id="G" edgedefault="directed">'
    ];

    // Add nodes
    for (const node of data.nodes) {
      lines.push(`    <node id="${this.escapeXML(node.id)}">`);
      lines.push(`      <data key="label">${this.escapeXML(node.properties.name || node.id)}</data>`);
      lines.push(`      <data key="type">${this.escapeXML(node.type)}</data>`);
      lines.push('    </node>');
    }

    // Add edges
    for (const edge of data.edges) {
      lines.push(`    <edge source="${this.escapeXML(edge.from)}" target="${this.escapeXML(edge.to)}">`);
      lines.push(`      <data key="weight">${edge.weight || 1}</data>`);
      lines.push('    </edge>');
    }

    lines.push('  </graph>');
    lines.push('</graphml>');

    return lines.join('\n');
  }

  /**
   * Export to GEXF format (Gephi)
   */
  static toGEXF(data: GraphData): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">',
      '  <meta lastmodifieddate="' + new Date().toISOString().split('T')[0] + '">',
      '    <creator>Summit Knowledge Graph</creator>',
      '  </meta>',
      '  <graph mode="static" defaultedgetype="directed">',
      '    <nodes>'
    ];

    // Add nodes
    for (const node of data.nodes) {
      const label = node.properties.name || node.id;
      lines.push(`      <node id="${this.escapeXML(node.id)}" label="${this.escapeXML(label)}"/>`);
    }

    lines.push('    </nodes>');
    lines.push('    <edges>');

    // Add edges
    let edgeId = 0;
    for (const edge of data.edges) {
      lines.push(`      <edge id="${edgeId++}" source="${this.escapeXML(edge.from)}" target="${this.escapeXML(edge.to)}" weight="${edge.weight || 1}"/>`);
    }

    lines.push('    </edges>');
    lines.push('  </graph>');
    lines.push('</gexf>');

    return lines.join('\n');
  }

  /**
   * Export to Cytoscape.js format
   */
  static toCytoscape(data: GraphData): object {
    return {
      elements: {
        nodes: data.nodes.map(n => ({
          data: {
            id: n.id,
            label: n.properties.name || n.id,
            type: n.type,
            ...n.properties
          }
        })),
        edges: data.edges.map((e, i) => ({
          data: {
            id: `e${i}`,
            source: e.from,
            target: e.to,
            label: e.type,
            weight: e.weight || 1,
            ...e.properties
          }
        }))
      }
    };
  }

  /**
   * Export using specified format
   */
  static export(data: GraphData, options: ExportOptions): string | object {
    switch (options.format) {
      case 'json':
        return this.toJSON(data, { prettyPrint: options.prettyPrint });
      case 'csv':
        return JSON.stringify(this.toCSV(data));
      case 'graphml':
        return this.toGraphML(data);
      case 'gexf':
        return this.toGEXF(data);
      case 'cytoscape':
        return this.toCytoscape(data);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private static escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export class GraphImporter {
  /**
   * Import graph from JSON
   */
  static fromJSON(json: string): GraphData {
    const data = JSON.parse(json);

    return {
      nodes: data.nodes.map((n: any) => ({
        id: n.id,
        type: n.type || 'Node',
        labels: n.labels || [n.type || 'Node'],
        properties: n.properties || {},
        metadata: n.metadata
      })),
      edges: data.edges.map((e: any) => ({
        from: e.source || e.from,
        to: e.target || e.to,
        type: e.type || 'RELATED_TO',
        properties: e.properties || {},
        weight: e.weight || 1
      })),
      metadata: data.metadata
    };
  }

  /**
   * Import from Cytoscape.js format
   */
  static fromCytoscape(data: any): GraphData {
    const elements = data.elements || data;

    return {
      nodes: (elements.nodes || []).map((n: any) => ({
        id: n.data.id,
        type: n.data.type || 'Node',
        labels: [n.data.type || 'Node'],
        properties: { ...n.data, id: undefined, type: undefined }
      })),
      edges: (elements.edges || []).map((e: any) => ({
        from: e.data.source,
        to: e.data.target,
        type: e.data.label || 'RELATED_TO',
        properties: { ...e.data, id: undefined, source: undefined, target: undefined, label: undefined },
        weight: e.data.weight || 1
      })),
      metadata: {}
    };
  }
}
