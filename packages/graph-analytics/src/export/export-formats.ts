/**
 * Graph Export Formats
 *
 * Exports graphs to standard formats (GEXF, GraphML, DOT) for use with
 * external visualization and analysis tools like Gephi, Cytoscape, and Graphviz.
 *
 * @module export/export-formats
 */

export interface GraphData {
  nodes: Array<{ id: string; label?: string; properties?: Record<string, any> }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
    weight?: number;
    properties?: Record<string, any>;
  }>;
  metadata?: {
    title?: string;
    description?: string;
    creator?: string;
    directed?: boolean;
  };
}

/**
 * Exports graph to GEXF format (Graph Exchange XML Format)
 * Used by Gephi and other tools
 */
export function exportToGEXF(graph: GraphData): string {
  const directed = graph.metadata?.directed ?? false;
  const mode = directed ? 'directed' : 'undirected';

  let gexf = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <meta>
    <creator>${escapeXml(graph.metadata?.creator || 'IntelGraph')}</creator>
    <description>${escapeXml(graph.metadata?.description || 'Intelligence Network Graph')}</description>
  </meta>
  <graph mode="static" defaultedgetype="${mode}">
    <attributes class="node">
`;

  // Collect all node attribute keys
  const nodeAttrs = new Set<string>();
  graph.nodes.forEach((n) => {
    if (n.properties) {
      Object.keys(n.properties).forEach((k) => nodeAttrs.add(k));
    }
  });

  // Define attributes
  let attrId = 0;
  const attrMap = new Map<string, number>();
  nodeAttrs.forEach((attr) => {
    gexf += `      <attribute id="${attrId}" title="${escapeXml(attr)}" type="string"/>\n`;
    attrMap.set(attr, attrId++);
  });

  gexf += `    </attributes>
    <nodes>
`;

  // Add nodes
  graph.nodes.forEach((node) => {
    const label = escapeXml(node.label || node.id);
    gexf += `      <node id="${escapeXml(node.id)}" label="${label}">
`;

    if (node.properties && Object.keys(node.properties).length > 0) {
      gexf += `        <attvalues>\n`;
      Object.entries(node.properties).forEach(([key, value]) => {
        const attrIdVal = attrMap.get(key);
        gexf += `          <attvalue for="${attrIdVal}" value="${escapeXml(String(value))}"/>\n`;
      });
      gexf += `        </attvalues>\n`;
    }

    gexf += `      </node>\n`;
  });

  gexf += `    </nodes>
    <edges>
`;

  // Add edges
  graph.edges.forEach((edge, index) => {
    const weight = edge.weight !== undefined ? ` weight="${edge.weight}"` : '';
    const label = edge.label ? ` label="${escapeXml(edge.label)}"` : '';
    gexf += `      <edge id="${index}" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}"${weight}${label}/>\n`;
  });

  gexf += `    </edges>
  </graph>
</gexf>`;

  return gexf;
}

/**
 * Exports graph to GraphML format
 * Used by yEd, Cytoscape, and other tools
 */
export function exportToGraphML(graph: GraphData): string {
  const directed = graph.metadata?.directed ?? false;
  const edgeDefault = directed ? 'directed' : 'undirected';

  let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
  <graph id="G" edgedefault="${edgeDefault}">
`;

  // Add nodes
  graph.nodes.forEach((node) => {
    graphml += `    <node id="${escapeXml(node.id)}">
`;
    if (node.label) {
      graphml += `      <data key="label">${escapeXml(node.label)}</data>\n`;
    }
    graphml += `    </node>\n`;
  });

  // Add edges
  graph.edges.forEach((edge, index) => {
    const directed = graph.metadata?.directed ? ' directed="true"' : '';
    graphml += `    <edge id="e${index}" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}"${directed}>
`;
    if (edge.weight !== undefined) {
      graphml += `      <data key="weight">${edge.weight}</data>\n`;
    }
    graphml += `    </edge>\n`;
  });

  graphml += `  </graph>
</graphml>`;

  return graphml;
}

/**
 * Exports graph to DOT format (Graphviz)
 * Can be rendered with Graphviz tools
 */
export function exportToDOT(graph: GraphData): string {
  const directed = graph.metadata?.directed ?? false;
  const graphType = directed ? 'digraph' : 'graph';
  const edgeOp = directed ? '->' : '--';

  let dot = `${graphType} G {\n`;
  dot += `  // ${graph.metadata?.title || 'Intelligence Network Graph'}\n`;
  dot += `  // ${graph.metadata?.description || ''}\n\n`;

  // Graph attributes
  dot += `  graph [rankdir=LR, overlap=false, splines=true];\n`;
  dot += `  node [shape=circle, style=filled, fillcolor=lightblue];\n\n`;

  // Add nodes
  graph.nodes.forEach((node) => {
    const label = escapeDot(node.label || node.id);
    const attrs: string[] = [`label="${label}"`];

    if (node.properties?.importance) {
      const importance = Number(node.properties.importance);
      if (importance > 0.7) {
        attrs.push('fillcolor=red');
      } else if (importance > 0.4) {
        attrs.push('fillcolor=orange');
      }
    }

    dot += `  "${escapeDot(node.id)}" [${attrs.join(', ')}];\n`;
  });

  dot += '\n';

  // Add edges
  graph.edges.forEach((edge) => {
    const attrs: string[] = [];

    if (edge.weight !== undefined) {
      attrs.push(`weight=${edge.weight}`);
      attrs.push(`penwidth=${Math.max(1, edge.weight * 3)}`);
    }

    if (edge.label) {
      attrs.push(`label="${escapeDot(edge.label)}"`);
    }

    const attrStr = attrs.length > 0 ? ` [${attrs.join(', ')}]` : '';
    dot += `  "${escapeDot(edge.source)}" ${edgeOp} "${escapeDot(edge.target)}"${attrStr};\n`;
  });

  dot += '}\n';

  return dot;
}

/**
 * Exports graph to JSON format (for d3.js and other web visualization libraries)
 */
export function exportToJSON(graph: GraphData): string {
  return JSON.stringify(
    {
      nodes: graph.nodes,
      links: graph.edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        label: edge.label,
        ...edge.properties,
      })),
      metadata: graph.metadata,
    },
    null,
    2,
  );
}

/**
 * Exports graph to CSV format (two files: nodes.csv and edges.csv)
 */
export function exportToCSV(graph: GraphData): { nodes: string; edges: string } {
  // Nodes CSV
  const nodeHeaders = ['id', 'label', ...getAllPropertyKeys(graph.nodes)];
  let nodesCsv = nodeHeaders.join(',') + '\n';

  graph.nodes.forEach((node) => {
    const row = [
      escapeCsv(node.id),
      escapeCsv(node.label || ''),
      ...nodeHeaders
        .slice(2)
        .map((h) => escapeCsv(String(node.properties?.[h] || ''))),
    ];
    nodesCsv += row.join(',') + '\n';
  });

  // Edges CSV
  const edgeHeaders = ['source', 'target', 'weight', 'label', ...getAllPropertyKeys(graph.edges)];
  let edgesCsv = edgeHeaders.join(',') + '\n';

  graph.edges.forEach((edge) => {
    const row = [
      escapeCsv(edge.source),
      escapeCsv(edge.target),
      escapeCsv(String(edge.weight || '')),
      escapeCsv(edge.label || ''),
      ...edgeHeaders
        .slice(4)
        .map((h) => escapeCsv(String(edge.properties?.[h] || ''))),
    ];
    edgesCsv += row.join(',') + '\n';
  });

  return { nodes: nodesCsv, edges: edgesCsv };
}

// Helper functions

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeDot(text: string): string {
  return text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function escapeCsv(text: string): string {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function getAllPropertyKeys(items: Array<{ properties?: Record<string, any> }>): string[] {
  const keys = new Set<string>();
  items.forEach((item) => {
    if (item.properties) {
      Object.keys(item.properties).forEach((k) => keys.add(k));
    }
  });
  return Array.from(keys).sort();
}
