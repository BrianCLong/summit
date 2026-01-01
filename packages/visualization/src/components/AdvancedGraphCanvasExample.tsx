import React, { useState, useEffect, useMemo } from 'react';
import { GraphCanvas, GraphNode, GraphLink } from '@intelgraph/visualization';
import { useVisualizationTheme, useSelection, useInteraction } from '@intelgraph/visualization';

// Advanced example with filtering, highlighting, and selection
const AdvancedGraphCanvasExample: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTooltips, setShowTooltips] = useState(true);
  const [highlightMode, setHighlightMode] = useState<'none' | 'connected' | 'type'>('connected');
  
  const { theme } = useVisualizationTheme();
  const { selectedIds, hoveredId } = useInteraction();

  // Generate more complex sample data
  useEffect(() => {
    const generateSampleData = () => {
      const nodeTypes = ['person', 'organization', 'location', 'document', 'malware', 'infrastructure', 'vulnerability', 'technique'];
      const nodeLabels = [
        'John Doe', 'Acme Corp', 'New York', 'Threat Report', 'Ransomware', 
        'Web Server', 'CVE-2023-1234', 'Spear Phishing', 'Jane Smith',
        'Tech Inc', 'London', 'Intelligence Brief', 'Trojan', 'Database Server',
        'CVE-2023-5678', 'Watering Hole', 'Bob Wilson', 'Defense Contractor',
        'Washington', 'Analysis Document', 'Backdoor', 'VPN Server',
        'CVE-2023-9012', 'Social Engineering'
      ];
      
      const sampleNodes: GraphNode[] = [];
      const sampleLinks: GraphLink[] = [];
      
      // Create nodes
      for (let i = 0; i < 20; i++) {
        const type = nodeTypes[i % nodeTypes.length];
        const label = nodeLabels[i % nodeLabels.length];
        
        sampleNodes.push({
          id: `node-${i}`,
          label: `${label} ${i + 1}`,
          type,
          size: 10 + (i % 5) * 3, // Varying sizes
          x: 100 + (i % 5) * 100,
          y: 100 + Math.floor(i / 5) * 100,
        });
      }
      
      // Create links
      for (let i = 0; i < 30; i++) {
        const sourceIdx = Math.floor(Math.random() * sampleNodes.length);
        let targetIdx = Math.floor(Math.random() * sampleNodes.length);
        
        // Ensure we don't have a node linking to itself
        while (targetIdx === sourceIdx) {
          targetIdx = Math.floor(Math.random() * sampleNodes.length);
        }
        
        sampleLinks.push({
          id: `link-${i}`,
          source: sampleNodes[sourceIdx].id,
          target: sampleNodes[targetIdx].id,
          type: `relationship-${i % 3}`,
          strength: Math.random(),
        });
      }
      
      setNodes(sampleNodes);
      setLinks(sampleLinks);
    };
    
    generateSampleData();
  }, []);

  // Filter nodes based on selected type and search term
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchesType = !selectedType || node.type === selectedType;
      const matchesSearch = !searchTerm || 
        node.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.type?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [nodes, selectedType, searchTerm]);

  // Node color mapping based on type
  const getNodeColor = (node: GraphNode): string => {
    if (highlightMode === 'type' && selectedType && node.type !== selectedType) {
      // Dim nodes that don't match the selected type
      return '#cccccc';
    }
    
    const colorMap: Record<string, string> = {
      person: '#3b82f6',         // blue
      organization: '#10b981',   // green
      location: '#8b5cf6',       // violet
      document: '#f59e0b',       // amber
      malware: '#ef4444',        // red
      infrastructure: '#06b6d4', // cyan
      vulnerability: '#ec4899',  // pink
      technique: '#f97316',      // orange
    };
    return colorMap[node.type || 'default'] || '#6b7280';
  };

  // Link color based on selection state
  const getLinkColor = (link: GraphLink): string => {
    if (highlightMode === 'connected' && selectedIds.size > 0) {
      // Highlight links connected to selected nodes
      const sourceNode = nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
      const targetNode = nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
      
      if (sourceNode && selectedIds.has(sourceNode.id)) return '#fbbf24';
      if (targetNode && selectedIds.has(targetNode.id)) return '#fbbf24';
    }
    return '#999';
  };

  // Apply highlighting based on current mode
  const getLinkOpacity = (link: GraphLink): number => {
    if (highlightMode === 'none') return 0.6;
    
    if (highlightMode === 'connected' && selectedIds.size > 0) {
      const sourceNode = nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
      const targetNode = nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
      
      if (sourceNode && selectedIds.has(sourceNode.id)) return 1;
      if (targetNode && selectedIds.has(targetNode.id)) return 1;
      return 0.2;
    }
    
    return 0.6;
  };

  return (
    <div style={{ padding: '20px', fontFamily: theme.fonts?.family || 'sans-serif' }}>
      <h1 style={{ color: theme.foreground, marginBottom: '20px' }}>Advanced IntelGraph Graph Canvas</h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 300px', 
        gap: '20px', 
        marginBottom: '20px' 
      }}>
        <div>
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              width: '100%',
              marginBottom: '10px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={selectedType || ''}
            onChange={(e) => setSelectedType(e.target.value || null)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              flex: '1'
            }}
          >
            <option value="">All Types</option>
            <option value="person">Person</option>
            <option value="organization">Organization</option>
            <option value="location">Location</option>
            <option value="document">Document</option>
            <option value="malware">Malware</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="vulnerability">Vulnerability</option>
            <option value="technique">Technique</option>
          </select>
          
          <select
            value={highlightMode}
            onChange={(e) => setHighlightMode(e.target.value as any)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              flex: '1'
            }}
          >
            <option value="none">No Highlight</option>
            <option value="connected">Connected Nodes</option>
            <option value="type">By Type</option>
          </select>
        </div>
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '600px', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <GraphCanvas
          nodes={filteredNodes}
          links={links}
          nodeColor={getNodeColor}
          linkColor={getLinkColor}
          linkWidth={(link) => 2}
          linkOpacity={getLinkOpacity}
          onNodeClick={(node) => {
            console.log('Node clicked:', node);
          }}
          tooltipContent={(node) => `${node.label} (${node.type})`}
          showLabels={true}
          enableSelection={true}
          enableHighlighting={true}
          highlightConnected={highlightMode === 'connected'}
          enableTooltips={showTooltips}
          enableZoom={true}
          enablePan={true}
          enableDrag={true}
          layout="force"
          layoutConfig={{ 
            linkDistance: 100,
            charge: -300,
            gravity: 0.1
          }}
        />
        
        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Legend</div>
          {Array.from(new Set(nodes.map(n => n.type))).map(type => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: getNodeColor({ id: 'temp', type } as GraphNode),
                  marginRight: '6px'
                }} 
              />
              <span>{type}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3>Controls</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label>
              <input
                type="checkbox"
                checked={showTooltips}
                onChange={(e) => setShowTooltips(e.target.checked)}
              />
              Show Tooltips
            </label>
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <h3>Selection Info</h3>
          <div>Selected Nodes: {selectedIds.size}</div>
          <div>Hovered Node: {hoveredId || 'None'}</div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedGraphCanvasExample;