import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SocialNetworkAnalysis.css';

// Social Network Analysis Interfaces
interface SocialNode {
  id: string;
  label: string;
  type: 'person' | 'organization' | 'location' | 'event' | 'document' | 'communication' | 'financial' | 'digital_asset';
  properties: {
    name: string;
    aliases?: string[];
    description?: string;
    importance: number; // 0-100
    riskScore: number; // 0-100
    lastActivity?: Date;
    verified?: boolean;
    tags: string[];
    metadata: Record<string, any>;
  };
  metrics: {
    centrality: {
      degree: number;
      betweenness: number;
      closeness: number;
      eigenvector: number;
    };
    clustering: number;
    influence: number;
    connectivity: number;
  };
  position?: { x: number; y: number };
  group?: string;
  color?: string;
  size?: number;
}

interface SocialEdge {
  id: string;
  source: string;
  target: string;
  type: 'communication' | 'financial' | 'social' | 'professional' | 'familial' | 'location' | 'digital' | 'temporal';
  properties: {
    label: string;
    strength: number; // 0-1
    direction: 'directed' | 'undirected';
    frequency: number;
    confidence: number; // 0-1
    firstSeen: Date;
    lastSeen: Date;
    tags: string[];
    metadata: Record<string, any>;
  };
  weight?: number;
  color?: string;
}

interface SocialCommunity {
  id: string;
  name: string;
  nodes: string[];
  properties: {
    size: number;
    density: number;
    cohesion: number;
    centralization: number;
    modularity: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    primaryActivity: string;
    description: string;
    tags: string[];
  };
  metrics: {
    internalConnections: number;
    externalConnections: number;
    bridgeNodes: string[];
    influentialNodes: string[];
  };
  color: string;
}

interface NetworkPath {
  id: string;
  source: string;
  target: string;
  path: string[];
  properties: {
    length: number;
    strength: number;
    riskScore: number;
    pathType: 'shortest' | 'strongest' | 'trusted' | 'suspicious';
    confidence: number;
    metadata: Record<string, any>;
  };
}

interface AnalysisQuery {
  type: 'centrality' | 'community' | 'path' | 'influence' | 'anomaly' | 'pattern' | 'flow' | 'temporal';
  parameters: Record<string, any>;
  filters?: {
    nodeTypes?: string[];
    edgeTypes?: string[];
    dateRange?: { start: Date; end: Date };
    minConfidence?: number;
    tags?: string[];
  };
}

interface SocialNetworkAnalysisProps {
  investigationId?: string;
  initialNodes?: SocialNode[];
  initialEdges?: SocialEdge[];
  onNodeSelect?: (node: SocialNode) => void;
  onEdgeSelect?: (edge: SocialEdge) => void;
  onCommunitySelect?: (community: SocialCommunity) => void;
  onPathAnalysis?: (paths: NetworkPath[]) => void;
  onAnalysisComplete?: (results: any) => void;
}

const SocialNetworkAnalysis: React.FC<SocialNetworkAnalysisProps> = ({
  investigationId,
  initialNodes = [],
  initialEdges = [],
  onNodeSelect,
  onEdgeSelect,
  onCommunitySelect,
  onPathAnalysis,
  onAnalysisComplete
}) => {
  // State Management
  const [nodes, setNodes] = useState<SocialNode[]>(initialNodes);
  const [edges, setEdges] = useState<SocialEdge[]>(initialEdges);
  const [communities, setCommunities] = useState<SocialCommunity[]>([]);
  const [selectedNode, setSelectedNode] = useState<SocialNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<SocialEdge | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<SocialCommunity | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'network' | 'analysis' | 'communities' | 'paths' | 'metrics'>('network');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'force' | 'circular' | 'hierarchical' | 'grid'>('force');
  const [viewMode, setViewMode] = useState<'graph' | 'matrix' | 'list'>('graph');
  
  // Analysis State
  const [currentQuery, setCurrentQuery] = useState<AnalysisQuery | null>(null);
  const [pathAnalysis, setPathAnalysis] = useState<NetworkPath[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Generate Mock Network Data
  const generateMockData = useCallback(() => {
    const mockNodes: SocialNode[] = [
      {
        id: 'person-1', label: 'John Smith', type: 'person',
        properties: {
          name: 'John Smith', aliases: ['Johnny S.', 'J.Smith'],
          description: 'Financial analyst with connections to offshore accounts',
          importance: 85, riskScore: 72, verified: true,
          tags: ['finance', 'analyst', 'high-priority'],
          metadata: { occupation: 'Financial Analyst', location: 'NYC' }
        },
        metrics: {
          centrality: { degree: 12, betweenness: 0.65, closeness: 0.78, eigenvector: 0.82 },
          clustering: 0.45, influence: 0.73, connectivity: 0.68
        },
        group: 'financial'
      },
      {
        id: 'org-1', label: 'Pacific Holdings Ltd', type: 'organization',
        properties: {
          name: 'Pacific Holdings Ltd', description: 'Offshore investment company',
          importance: 92, riskScore: 88, verified: false,
          tags: ['offshore', 'investment', 'suspicious'],
          metadata: { jurisdiction: 'Cayman Islands', established: '2018' }
        },
        metrics: {
          centrality: { degree: 18, betweenness: 0.82, closeness: 0.91, eigenvector: 0.94 },
          clustering: 0.32, influence: 0.89, connectivity: 0.85
        },
        group: 'financial'
      },
      {
        id: 'person-2', label: 'Maria Rodriguez', type: 'person',
        properties: {
          name: 'Maria Rodriguez', aliases: ['M.Rodriguez'],
          description: 'Corporate lawyer specializing in international transactions',
          importance: 78, riskScore: 45, verified: true,
          tags: ['legal', 'international', 'professional'],
          metadata: { occupation: 'Lawyer', location: 'Miami' }
        },
        metrics: {
          centrality: { degree: 9, betweenness: 0.51, closeness: 0.62, eigenvector: 0.58 },
          clustering: 0.67, influence: 0.54, connectivity: 0.48
        },
        group: 'legal'
      },
      {
        id: 'location-1', label: 'Zurich Office Complex', type: 'location',
        properties: {
          name: 'Zurich Office Complex',
          description: 'High-security commercial building housing multiple shell companies',
          importance: 65, riskScore: 73, verified: true,
          tags: ['meeting-place', 'commercial', 'high-security'],
          metadata: { address: 'Bahnhofstrasse 45, Zurich', type: 'Commercial Building' }
        },
        metrics: {
          centrality: { degree: 14, betweenness: 0.72, closeness: 0.58, eigenvector: 0.61 },
          clustering: 0.38, influence: 0.67, connectivity: 0.55
        },
        group: 'location'
      },
      {
        id: 'digital-1', label: 'Account #78429X', type: 'digital_asset',
        properties: {
          name: 'Cryptocurrency Wallet #78429X',
          description: 'High-value Bitcoin wallet with suspicious transaction patterns',
          importance: 71, riskScore: 91, verified: true,
          tags: ['cryptocurrency', 'bitcoin', 'suspicious-activity'],
          metadata: { blockchain: 'Bitcoin', balance: '127.5 BTC', lastTx: '2024-01-15' }
        },
        metrics: {
          centrality: { degree: 6, betweenness: 0.34, closeness: 0.29, eigenvector: 0.31 },
          clustering: 0.83, influence: 0.78, connectivity: 0.42
        },
        group: 'digital'
      }
    ];

    const mockEdges: SocialEdge[] = [
      {
        id: 'edge-1', source: 'person-1', target: 'org-1', type: 'financial',
        properties: {
          label: 'Board Member', strength: 0.85, direction: 'directed',
          frequency: 156, confidence: 0.92,
          firstSeen: new Date('2019-03-15'), lastSeen: new Date('2024-01-20'),
          tags: ['board-member', 'financial-control'],
          metadata: { role: 'Board Member', appointed: '2019-03-15' }
        }
      },
      {
        id: 'edge-2', source: 'person-2', target: 'org-1', type: 'professional',
        properties: {
          label: 'Legal Counsel', strength: 0.78, direction: 'directed',
          frequency: 89, confidence: 0.87,
          firstSeen: new Date('2018-11-22'), lastSeen: new Date('2024-01-18'),
          tags: ['legal-counsel', 'professional-services'],
          metadata: { relationship: 'Legal Counsel', retainer: 'Active' }
        }
      },
      {
        id: 'edge-3', source: 'person-1', target: 'location-1', type: 'location',
        properties: {
          label: 'Frequent Visitor', strength: 0.64, direction: 'undirected',
          frequency: 47, confidence: 0.73,
          firstSeen: new Date('2019-01-08'), lastSeen: new Date('2024-01-12'),
          tags: ['frequent-visits', 'business-meetings'],
          metadata: { visitFrequency: 'Weekly', purpose: 'Business Meetings' }
        }
      },
      {
        id: 'edge-4', source: 'org-1', target: 'digital-1', type: 'financial',
        properties: {
          label: 'Asset Controller', strength: 0.92, direction: 'directed',
          frequency: 203, confidence: 0.95,
          firstSeen: new Date('2020-06-10'), lastSeen: new Date('2024-01-21'),
          tags: ['asset-control', 'cryptocurrency', 'high-value'],
          metadata: { controlType: 'Primary Wallet', totalValue: '127.5 BTC' }
        }
      }
    ];

    const mockCommunities: SocialCommunity[] = [
      {
        id: 'community-1', name: 'Financial Network', nodes: ['person-1', 'org-1', 'digital-1'],
        properties: {
          size: 3, density: 0.89, cohesion: 0.76, centralization: 0.82, modularity: 0.68,
          riskLevel: 'high', primaryActivity: 'Offshore Financial Operations',
          description: 'Tightly connected network involved in offshore financial operations',
          tags: ['financial', 'offshore', 'high-risk']
        },
        metrics: {
          internalConnections: 4, externalConnections: 2,
          bridgeNodes: ['person-1'], influentialNodes: ['org-1', 'person-1']
        },
        color: '#ff6b6b'
      },
      {
        id: 'community-2', name: 'Legal-Professional', nodes: ['person-2', 'location-1'],
        properties: {
          size: 2, density: 0.67, cohesion: 0.54, centralization: 0.61, modularity: 0.45,
          riskLevel: 'medium', primaryActivity: 'Legal and Professional Services',
          description: 'Professional services network with international connections',
          tags: ['legal', 'professional', 'international']
        },
        metrics: {
          internalConnections: 1, externalConnections: 3,
          bridgeNodes: ['person-2'], influentialNodes: ['person-2']
        },
        color: '#4ecdc4'
      }
    ];

    setNodes(mockNodes);
    setEdges(mockEdges);
    setCommunities(mockCommunities);

    // Generate metrics
    const networkMetrics = {
      overview: {
        totalNodes: mockNodes.length,
        totalEdges: mockEdges.length,
        totalCommunities: mockCommunities.length,
        networkDensity: 0.45,
        averageClusteringCoefficient: 0.58,
        networkDiameter: 4,
        averagePathLength: 2.3
      },
      centrality: {
        mostCentral: 'org-1',
        mostInfluential: 'org-1',
        keyBridgeNodes: ['person-1', 'person-2'],
        isolatedNodes: []
      },
      risk: {
        highRiskNodes: ['org-1', 'digital-1'],
        suspiciousConnections: ['edge-4'],
        anomalousPatterns: ['circular-transactions', 'rapid-asset-movement']
      }
    };

    setMetrics(networkMetrics);
  }, []);

  // Initialize data
  useEffect(() => {
    if (nodes.length === 0) {
      generateMockData();
    }
  }, [generateMockData, nodes.length]);

  // Network Analysis Functions
  const runNetworkAnalysis = useCallback(async (query: AnalysisQuery) => {
    setIsAnalyzing(true);
    setCurrentQuery(query);

    // Simulate analysis processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    let results: any = {};

    switch (query.type) {
      case 'centrality':
        results = {
          type: 'centrality',
          results: nodes.map(node => ({
            nodeId: node.id,
            name: node.properties.name,
            centralityScores: node.metrics.centrality,
            rank: Math.floor(Math.random() * nodes.length) + 1
          })).sort((a, b) => b.centralityScores.eigenvector - a.centralityScores.eigenvector)
        };
        break;

      case 'community':
        results = {
          type: 'community',
          results: {
            communities: communities,
            modularity: 0.68,
            totalCommunities: communities.length,
            largestCommunity: communities.reduce((max, c) => c.properties.size > max.properties.size ? c : max)
          }
        };
        break;

      case 'path':
        const mockPaths: NetworkPath[] = [
          {
            id: 'path-1', source: query.parameters.source, target: query.parameters.target,
            path: ['person-1', 'org-1', 'digital-1'],
            properties: {
              length: 3, strength: 0.85, riskScore: 0.78, pathType: 'shortest',
              confidence: 0.92, metadata: { analysis: 'Direct financial control path' }
            }
          }
        ];
        setPathAnalysis(mockPaths);
        results = { type: 'path', results: mockPaths };
        break;

      case 'anomaly':
        const mockAnomalies = [
          {
            id: 'anomaly-1', type: 'unusual-centrality', nodeId: 'org-1',
            description: 'Unexpectedly high betweenness centrality for organization type',
            severity: 'high', confidence: 0.87,
            details: { expected: 0.45, observed: 0.82, deviation: 2.3 }
          },
          {
            id: 'anomaly-2', type: 'temporal-cluster', edgeIds: ['edge-1', 'edge-4'],
            description: 'Simultaneous activation of dormant connections',
            severity: 'medium', confidence: 0.73,
            details: { timeWindow: '2024-01-15 to 2024-01-21', connections: 2 }
          }
        ];
        setAnomalies(mockAnomalies);
        results = { type: 'anomaly', results: mockAnomalies };
        break;

      default:
        results = { type: query.type, results: 'Analysis completed' };
    }

    setAnalysisResults(results);
    setIsAnalyzing(false);
    onAnalysisComplete?.(results);
  }, [nodes, communities, onAnalysisComplete]);

  // Node Selection Handler
  const handleNodeSelect = useCallback((node: SocialNode) => {
    setSelectedNode(node);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  // Edge Selection Handler
  const handleEdgeSelect = useCallback((edge: SocialEdge) => {
    setSelectedEdge(edge);
    onEdgeSelect?.(edge);
  }, [onEdgeSelect]);

  // Community Selection Handler
  const handleCommunitySelect = useCallback((community: SocialCommunity) => {
    setSelectedCommunity(community);
    onCommunitySelect?.(community);
  }, [onCommunitySelect]);

  // Filtered Data
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = searchTerm === '' || 
      node.properties.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.properties.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || node.type === filterType;
    return matchesSearch && matchesType;
  });

  const filteredEdges = edges.filter(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    return filteredNodes.includes(sourceNode!) && filteredNodes.includes(targetNode!);
  });

  // Canvas Drawing (Simplified Network Visualization)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw nodes
    filteredNodes.forEach((node, index) => {
      const x = (index % 4) * 180 + 100;
      const y = Math.floor(index / 4) * 120 + 80;
      
      // Draw node circle
      const size = (node.metrics.centrality.eigenvector * 30) + 15;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      
      // Color based on risk score
      const riskColor = node.properties.riskScore > 75 ? '#ff4757' : 
                       node.properties.riskScore > 50 ? '#ffa726' : '#26c6da';
      ctx.fillStyle = riskColor;
      ctx.fill();
      
      // Border for selected node
      if (selectedNode?.id === node.id) {
        ctx.strokeStyle = '#2f3542';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Node label
      ctx.fillStyle = '#2f3542';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, x, y + size + 15);
    });

    // Draw edges (simplified)
    filteredEdges.forEach(edge => {
      const sourceIndex = filteredNodes.findIndex(n => n.id === edge.source);
      const targetIndex = filteredNodes.findIndex(n => n.id === edge.target);
      
      if (sourceIndex === -1 || targetIndex === -1) return;
      
      const sourceX = (sourceIndex % 4) * 180 + 100;
      const sourceY = Math.floor(sourceIndex / 4) * 120 + 80;
      const targetX = (targetIndex % 4) * 180 + 100;
      const targetY = Math.floor(targetIndex / 4) * 120 + 80;
      
      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY);
      ctx.lineTo(targetX, targetY);
      ctx.strokeStyle = selectedEdge?.id === edge.id ? '#2f3542' : '#a4b0be';
      ctx.lineWidth = edge.properties.strength * 3 + 1;
      ctx.stroke();
    });
  }, [filteredNodes, filteredEdges, selectedNode, selectedEdge]);

  return (
    <div className="social-network-analysis">
      {/* Header */}
      <div className="sna-header">
        <div className="header-main">
          <h2>🕸️ Social Network Analysis</h2>
          <div className="header-stats">
            <span className="stat">
              <strong>{filteredNodes.length}</strong> Nodes
            </span>
            <span className="stat">
              <strong>{filteredEdges.length}</strong> Edges  
            </span>
            <span className="stat">
              <strong>{communities.length}</strong> Communities
            </span>
          </div>
        </div>
        <div className="header-controls">
          <input
            type="text"
            placeholder="Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="person">Person</option>
            <option value="organization">Organization</option>
            <option value="location">Location</option>
            <option value="digital_asset">Digital Asset</option>
          </select>
          <select
            value={layoutMode}
            onChange={(e) => setLayoutMode(e.target.value as any)}
            className="layout-select"
          >
            <option value="force">Force Layout</option>
            <option value="circular">Circular</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="grid">Grid</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sna-tabs">
        <button 
          className={`tab-button ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          🌐 Network
        </button>
        <button 
          className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          🔍 Analysis
        </button>
        <button 
          className={`tab-button ${activeTab === 'communities' ? 'active' : ''}`}
          onClick={() => setActiveTab('communities')}
        >
          👥 Communities
        </button>
        <button 
          className={`tab-button ${activeTab === 'paths' ? 'active' : ''}`}
          onClick={() => setActiveTab('paths')}
        >
          🛤️ Paths
        </button>
        <button 
          className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          📊 Metrics
        </button>
      </div>

      <div className="sna-content">
        {/* Network Tab */}
        {activeTab === 'network' && (
          <div className="network-tab">
            <div className="network-main">
              <div className="network-canvas-container">
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="network-canvas"
                  onClick={(e) => {
                    // Simplified click detection
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    filteredNodes.forEach((node, index) => {
                      const nodeX = (index % 4) * 180 + 100;
                      const nodeY = Math.floor(index / 4) * 120 + 80;
                      const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
                      
                      if (distance < 30) {
                        handleNodeSelect(node);
                      }
                    });
                  }}
                />
                <div className="canvas-controls">
                  <button className="canvas-control">🔍 Zoom In</button>
                  <button className="canvas-control">🔍 Zoom Out</button>
                  <button className="canvas-control">🔄 Reset</button>
                  <button className="canvas-control">📷 Export</button>
                </div>
              </div>
              
              {/* Network Legend */}
              <div className="network-legend">
                <h4>Legend</h4>
                <div className="legend-items">
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#ff4757' }}></div>
                    <span>High Risk (75+)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#ffa726' }}></div>
                    <span>Medium Risk (50-75)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#26c6da' }}></div>
                    <span>Low Risk (0-50)</span>
                  </div>
                </div>
                
                <h4>Node Types</h4>
                <div className="legend-items">
                  <div className="legend-item">👤 Person</div>
                  <div className="legend-item">🏢 Organization</div>
                  <div className="legend-item">📍 Location</div>
                  <div className="legend-item">💰 Digital Asset</div>
                </div>
              </div>
            </div>
            
            {/* Selected Entity Details */}
            {selectedNode && (
              <div className="entity-details">
                <h3>Selected Entity: {selectedNode.label}</h3>
                <div className="entity-info">
                  <div className="info-section">
                    <h4>Properties</h4>
                    <div className="property-item">
                      <strong>Type:</strong> {selectedNode.type}
                    </div>
                    <div className="property-item">
                      <strong>Risk Score:</strong> 
                      <span className={`risk-badge ${selectedNode.properties.riskScore > 75 ? 'high' : 
                                                    selectedNode.properties.riskScore > 50 ? 'medium' : 'low'}`}>
                        {selectedNode.properties.riskScore}
                      </span>
                    </div>
                    <div className="property-item">
                      <strong>Importance:</strong> {selectedNode.properties.importance}
                    </div>
                    <div className="property-item">
                      <strong>Tags:</strong> {selectedNode.properties.tags.join(', ')}
                    </div>
                  </div>
                  
                  <div className="info-section">
                    <h4>Network Metrics</h4>
                    <div className="property-item">
                      <strong>Degree Centrality:</strong> {selectedNode.metrics.centrality.degree}
                    </div>
                    <div className="property-item">
                      <strong>Betweenness:</strong> {selectedNode.metrics.centrality.betweenness.toFixed(3)}
                    </div>
                    <div className="property-item">
                      <strong>Closeness:</strong> {selectedNode.metrics.centrality.closeness.toFixed(3)}
                    </div>
                    <div className="property-item">
                      <strong>Influence:</strong> {selectedNode.metrics.influence.toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="analysis-tab">
            <div className="analysis-controls">
              <h3>Network Analysis Tools</h3>
              <div className="analysis-buttons">
                <button 
                  className="analysis-button"
                  onClick={() => runNetworkAnalysis({ type: 'centrality', parameters: {} })}
                  disabled={isAnalyzing}
                >
                  🎯 Centrality Analysis
                </button>
                <button 
                  className="analysis-button"
                  onClick={() => runNetworkAnalysis({ type: 'community', parameters: {} })}
                  disabled={isAnalyzing}
                >
                  👥 Community Detection
                </button>
                <button 
                  className="analysis-button"
                  onClick={() => runNetworkAnalysis({ 
                    type: 'path', 
                    parameters: { source: 'person-1', target: 'digital-1' } 
                  })}
                  disabled={isAnalyzing}
                >
                  🛤️ Path Analysis
                </button>
                <button 
                  className="analysis-button"
                  onClick={() => runNetworkAnalysis({ type: 'anomaly', parameters: {} })}
                  disabled={isAnalyzing}
                >
                  🚨 Anomaly Detection
                </button>
              </div>
            </div>

            {isAnalyzing && (
              <div className="analysis-loading">
                <div className="loading-spinner"></div>
                <span>Analyzing network structure...</span>
              </div>
            )}

            {analysisResults && (
              <div className="analysis-results">
                <h3>Analysis Results</h3>
                {analysisResults.type === 'centrality' && (
                  <div className="centrality-results">
                    <h4>Node Centrality Rankings</h4>
                    <div className="results-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Entity</th>
                            <th>Eigenvector</th>
                            <th>Betweenness</th>
                            <th>Closeness</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisResults.results.slice(0, 5).map((result: any, index: number) => (
                            <tr key={result.nodeId}>
                              <td>{index + 1}</td>
                              <td>{result.name}</td>
                              <td>{result.centralityScores.eigenvector.toFixed(3)}</td>
                              <td>{result.centralityScores.betweenness.toFixed(3)}</td>
                              <td>{result.centralityScores.closeness.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {analysisResults.type === 'anomaly' && (
                  <div className="anomaly-results">
                    <h4>Detected Anomalies</h4>
                    <div className="anomaly-list">
                      {analysisResults.results.map((anomaly: any) => (
                        <div key={anomaly.id} className={`anomaly-item ${anomaly.severity}`}>
                          <div className="anomaly-header">
                            <span className="anomaly-type">{anomaly.type}</span>
                            <span className={`severity-badge ${anomaly.severity}`}>
                              {anomaly.severity}
                            </span>
                          </div>
                          <div className="anomaly-description">
                            {anomaly.description}
                          </div>
                          <div className="anomaly-confidence">
                            Confidence: {(anomaly.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Communities Tab */}
        {activeTab === 'communities' && (
          <div className="communities-tab">
            <h3>Network Communities</h3>
            <div className="communities-grid">
              {communities.map(community => (
                <div 
                  key={community.id} 
                  className={`community-card ${selectedCommunity?.id === community.id ? 'selected' : ''}`}
                  onClick={() => handleCommunitySelect(community)}
                >
                  <div className="community-header">
                    <div 
                      className="community-color" 
                      style={{ backgroundColor: community.color }}
                    ></div>
                    <h4>{community.name}</h4>
                    <span className={`risk-level ${community.properties.riskLevel}`}>
                      {community.properties.riskLevel}
                    </span>
                  </div>
                  
                  <div className="community-stats">
                    <div className="stat-item">
                      <strong>Size:</strong> {community.properties.size} nodes
                    </div>
                    <div className="stat-item">
                      <strong>Density:</strong> {community.properties.density.toFixed(2)}
                    </div>
                    <div className="stat-item">
                      <strong>Cohesion:</strong> {community.properties.cohesion.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="community-description">
                    {community.properties.description}
                  </div>
                  
                  <div className="community-tags">
                    {community.properties.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedCommunity && (
              <div className="community-details">
                <h3>Community Analysis: {selectedCommunity.name}</h3>
                <div className="community-analysis">
                  <div className="analysis-section">
                    <h4>Key Metrics</h4>
                    <div className="metrics-grid">
                      <div className="metric">
                        <strong>Internal Connections:</strong> {selectedCommunity.metrics.internalConnections}
                      </div>
                      <div className="metric">
                        <strong>External Connections:</strong> {selectedCommunity.metrics.externalConnections}
                      </div>
                      <div className="metric">
                        <strong>Modularity:</strong> {selectedCommunity.properties.modularity.toFixed(3)}
                      </div>
                      <div className="metric">
                        <strong>Centralization:</strong> {selectedCommunity.properties.centralization.toFixed(3)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="analysis-section">
                    <h4>Key Nodes</h4>
                    <div className="key-nodes">
                      <div className="node-group">
                        <strong>Bridge Nodes:</strong>
                        <div className="node-list">
                          {selectedCommunity.metrics.bridgeNodes.map(nodeId => {
                            const node = nodes.find(n => n.id === nodeId);
                            return node ? (
                              <span key={nodeId} className="node-chip">{node.label}</span>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div className="node-group">
                        <strong>Influential Nodes:</strong>
                        <div className="node-list">
                          {selectedCommunity.metrics.influentialNodes.map(nodeId => {
                            const node = nodes.find(n => n.id === nodeId);
                            return node ? (
                              <span key={nodeId} className="node-chip influential">{node.label}</span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paths Tab */}
        {activeTab === 'paths' && (
          <div className="paths-tab">
            <div className="paths-controls">
              <h3>Path Analysis</h3>
              <div className="path-inputs">
                <select className="path-select">
                  <option value="">Select source...</option>
                  {nodes.map(node => (
                    <option key={node.id} value={node.id}>{node.label}</option>
                  ))}
                </select>
                <select className="path-select">
                  <option value="">Select target...</option>
                  {nodes.map(node => (
                    <option key={node.id} value={node.id}>{node.label}</option>
                  ))}
                </select>
                <button className="analyze-button">Find Paths</button>
              </div>
            </div>

            {pathAnalysis.length > 0 && (
              <div className="paths-results">
                <h4>Discovered Paths</h4>
                <div className="paths-list">
                  {pathAnalysis.map(path => (
                    <div key={path.id} className="path-item">
                      <div className="path-header">
                        <span className={`path-type ${path.properties.pathType}`}>
                          {path.properties.pathType}
                        </span>
                        <span className="path-length">
                          Length: {path.properties.length}
                        </span>
                        <span className="path-strength">
                          Strength: {path.properties.strength.toFixed(2)}
                        </span>
                        <span className={`path-risk ${path.properties.riskScore > 0.75 ? 'high' : 
                                                    path.properties.riskScore > 0.5 ? 'medium' : 'low'}`}>
                          Risk: {(path.properties.riskScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      <div className="path-visualization">
                        {path.path.map((nodeId, index) => {
                          const node = nodes.find(n => n.id === nodeId);
                          return (
                            <React.Fragment key={nodeId}>
                              <span className="path-node">{node?.label}</span>
                              {index < path.path.length - 1 && (
                                <span className="path-arrow">→</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      
                      <div className="path-details">
                        <strong>Analysis:</strong> {path.properties.metadata.analysis}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="metrics-tab">
            <h3>Network Metrics Overview</h3>
            
            {Object.keys(metrics).length > 0 && (
              <div className="metrics-dashboard">
                <div className="metrics-section">
                  <h4>📊 Network Overview</h4>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-value">{metrics.overview?.totalNodes}</div>
                      <div className="metric-label">Total Nodes</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">{metrics.overview?.totalEdges}</div>
                      <div className="metric-label">Total Edges</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">{metrics.overview?.totalCommunities}</div>
                      <div className="metric-label">Communities</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">{metrics.overview?.networkDensity?.toFixed(3)}</div>
                      <div className="metric-label">Network Density</div>
                    </div>
                  </div>
                </div>

                <div className="metrics-section">
                  <h4>🎯 Centrality Analysis</h4>
                  <div className="centrality-info">
                    <div className="info-item">
                      <strong>Most Central Entity:</strong> 
                      <span className="entity-name">
                        {nodes.find(n => n.id === metrics.centrality?.mostCentral)?.label}
                      </span>
                    </div>
                    <div className="info-item">
                      <strong>Most Influential:</strong> 
                      <span className="entity-name">
                        {nodes.find(n => n.id === metrics.centrality?.mostInfluential)?.label}
                      </span>
                    </div>
                    <div className="info-item">
                      <strong>Key Bridge Nodes:</strong>
                      <div className="bridge-nodes">
                        {metrics.centrality?.keyBridgeNodes?.map((nodeId: string) => {
                          const node = nodes.find(n => n.id === nodeId);
                          return node ? (
                            <span key={nodeId} className="bridge-node">{node.label}</span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="metrics-section">
                  <h4>⚠️ Risk Assessment</h4>
                  <div className="risk-analysis">
                    <div className="risk-item">
                      <strong>High Risk Entities:</strong>
                      <div className="risk-entities">
                        {metrics.risk?.highRiskNodes?.map((nodeId: string) => {
                          const node = nodes.find(n => n.id === nodeId);
                          return node ? (
                            <span key={nodeId} className="risk-entity high">{node.label}</span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div className="risk-item">
                      <strong>Suspicious Patterns:</strong>
                      <div className="risk-patterns">
                        {metrics.risk?.anomalousPatterns?.map((pattern: string, index: number) => (
                          <span key={index} className="pattern-tag">{pattern}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialNetworkAnalysis;