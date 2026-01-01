import React, { useState, useEffect } from 'react';
import { GraphCanvas, GraphNode, GraphLink } from '@intelgraph/visualization';
import { useVisualizationTheme } from '@intelgraph/visualization';

// Example component showing how to use the GraphCanvas
const GraphCanvasExample: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [filterText, setFilterText] = useState('');
  
  const { theme } = useVisualizationTheme();

  // Generate sample data
  useEffect(() => {
    // Create sample nodes
    const sampleNodes: GraphNode[] = [
      { id: '1', label: 'Intelligence Report', type: 'document', size: 20, x: 100, y: 100 },
      { id: '2', label: 'Threat Actor', type: 'actor', size: 15, x: 200, y: 150 },
      { id: '3', label: 'Network Infrastructure', type: 'infrastructure', size: 18, x: 300, y: 100 },
      { id: '4', label: 'Malware Variant', type: 'malware', size: 12, x: 150, y: 250 },
      { id: '5', label: 'Victim Organization', type: 'organization', size: 16, x: 350, y: 200 },
      { id: '6', label: 'C2 Server', type: 'server', size: 14, x: 250, y: 300 },
      { id: '7', label: 'Attack Vector', type: 'technique', size: 10, x: 400, y: 250 },
      { id: '8', label: 'Vulnerability', type: 'vulnerability', size: 13, x: 300, y: 50 },
    ];

    // Create sample links
    const sampleLinks: GraphLink[] = [
      { id: 'l1', source: '1', target: '2', type: 'mentions' },
      { id: 'l2', source: '2', target: '3', type: 'controls' },
      { id: 'l3', source: '2', target: '4', type: 'uses' },
      { id: 'l4', source: '3', target: '6', type: 'connects' },
      { id: 'l5', source: '4', target: '6', type: 'communicates' },
      { id: 'l6', source: '6', target: '5', type: 'targets' },
      { id: 'l7', source: '2', target: '7', type: 'employs' },
      { id: 'l8', source: '7', target: '8', type: 'exploits' },
      { id: 'l9', source: '1', target: '8', type: 'identifies' },
    ];

    setNodes(sampleNodes);
    setLinks(sampleLinks);
  }, []);

  // Node color mapping based on type
  const getNodeColor = (node: GraphNode): string => {
    const colorMap: Record<string, string> = {
      document: '#3b82f6', // blue
      actor: '#ef4444',    // red
      infrastructure: '#10b981', // green
      malware: '#f59e0b',  // amber
      organization: '#8b5cf6', // violet
      server: '#ec4899',   // pink
      technique: '#6b7280', // gray
      vulnerability: '#f97316', // orange
    };
    return colorMap[node.type || 'default'] || '#6b7280';
  };

  // Filter nodes based on search text
  const filteredNodes = filterText 
    ? nodes.filter(node => 
        node.label?.toLowerCase().includes(filterText.toLowerCase()) ||
        node.type?.toLowerCase().includes(filterText.toLowerCase())
      )
    : nodes;

  return (
    <div style={{ padding: '20px', fontFamily: theme.fonts?.family || 'sans-serif' }}>
      <h1 style={{ color: theme.foreground, marginBottom: '20px' }}>IntelGraph Graph Canvas</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Filter nodes..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            width: '300px',
            marginBottom: '10px'
          }}
        />
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '600px', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <GraphCanvas
          nodes={filteredNodes}
          links={links}
          nodeColor={getNodeColor}
          onNodeClick={(node) => {
            setSelectedNode(node);
            console.log('Node clicked:', node);
          }}
          onNodeHover={(node) => {
            setHoveredNode(node);
          }}
          tooltipContent={(node) => `${node.label} (${node.type})`}
          showLabels={true}
          enableSelection={true}
          enableHighlighting={true}
          highlightConnected={true}
          enableTooltips={true}
          enableZoom={true}
          enablePan={true}
          enableDrag={true}
          layout="force"
        />
      </div>
      
      <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
        <div>
          <h3>Selected Node</h3>
          <pre>{selectedNode ? JSON.stringify(selectedNode, null, 2) : 'None'}</pre>
        </div>
        <div>
          <h3>Hovered Node</h3>
          <pre>{hoveredNode ? JSON.stringify(hoveredNode, null, 2) : 'None'}</pre>
        </div>
      </div>
    </div>
  );
};

export default GraphCanvasExample;