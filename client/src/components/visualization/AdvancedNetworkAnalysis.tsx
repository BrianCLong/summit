import React, { useState, useEffect, useRef } from 'react';

interface NetworkNode {
  id: string;
  label: string;
  type:
    | 'person'
    | 'organization'
    | 'location'
    | 'event'
    | 'document'
    | 'ip'
    | 'domain'
    | 'hash';
  size: number;
  color: string;
  metadata: {
    confidence: number;
    lastSeen: Date;
    frequency: number;
    risk: 'low' | 'medium' | 'high' | 'critical';
    centrality?: {
      betweenness: number;
      closeness: number;
      eigenvector: number;
      pagerank: number;
    };
  };
  x?: number;
  y?: number;
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type:
    | 'communication'
    | 'transaction'
    | 'relationship'
    | 'correlation'
    | 'hierarchy'
    | 'temporal';
  weight: number;
  label?: string;
  metadata: {
    confidence: number;
    frequency: number;
    firstSeen: Date;
    lastSeen: Date;
    direction: 'directed' | 'undirected';
  };
}

interface CommunityDetection {
  id: string;
  nodes: string[];
  size: number;
  density: number;
  modularity: number;
  color: string;
}

interface PathAnalysis {
  id: string;
  source: string;
  target: string;
  path: string[];
  length: number;
  weight: number;
  type: 'shortest' | 'strongest' | 'most_frequent';
}

interface AnalysisMetrics {
  networkDensity: number;
  clusteringCoefficient: number;
  averagePathLength: number;
  networkDiameter: number;
  modularity: number;
  centralityDistribution: {
    betweenness: { min: number; max: number; avg: number };
    closeness: { min: number; max: number; avg: number };
    eigenvector: { min: number; max: number; avg: number };
    pagerank: { min: number; max: number; avg: number };
  };
}

interface AdvancedNetworkAnalysisProps {
  investigationId?: string;
  onNodeSelect?: (nodes: NetworkNode[]) => void;
  onEdgeSelect?: (edges: NetworkEdge[]) => void;
  onCommunitySelect?: (community: CommunityDetection) => void;
  onPathAnalysis?: (analysis: PathAnalysis) => void;
  onMetricsChange?: (metrics: AnalysisMetrics) => void;
  enableCommunityDetection?: boolean;
  enablePathAnalysis?: boolean;
  enableCentralityAnalysis?: boolean;
  enableTemporalAnalysis?: boolean;
  className?: string;
}

const AdvancedNetworkAnalysis: React.FC<AdvancedNetworkAnalysisProps> = ({
  investigationId,
  onNodeSelect = () => {},
  onEdgeSelect = () => {},
  onCommunitySelect = () => {},
  onPathAnalysis = () => {},
  onMetricsChange = () => {},
  enableCommunityDetection = true,
  enablePathAnalysis = true,
  enableCentralityAnalysis = true,
  enableTemporalAnalysis = true,
  className = '',
}) => {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [communities, setCommunities] = useState<CommunityDetection[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<NetworkNode[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<NetworkEdge[]>([]);
  const [analysisMode, setAnalysisMode] = useState<
    'overview' | 'centrality' | 'community' | 'paths' | 'temporal'
  >('overview');
  const [metrics, setMetrics] = useState<AnalysisMetrics | null>(null);
  const [pathAnalysis, setPathAnalysis] = useState<PathAnalysis[]>([]);
  const [selectedCommunity, setSelectedCommunity] =
    useState<CommunityDetection | null>(null);
  const [temporalFilter, setTemporalFilter] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [centralityType, setCentralityType] = useState<
    'betweenness' | 'closeness' | 'eigenvector' | 'pagerank'
  >('betweenness');
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<
    'force' | 'circular' | 'hierarchical' | 'community'
  >('force');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mock data generation
  useEffect(() => {
    generateMockNetworkData();
    const interval = setInterval(() => {
      if (enableTemporalAnalysis) {
        updateTemporalData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [investigationId, enableTemporalAnalysis]);

  const generateMockNetworkData = () => {
    // Generate nodes
    const nodeTypes: NetworkNode['type'][] = [
      'person',
      'organization',
      'location',
      'event',
      'document',
      'ip',
      'domain',
      'hash',
    ];
    const riskLevels: ('low' | 'medium' | 'high' | 'critical')[] = [
      'low',
      'medium',
      'high',
      'critical',
    ];

    const mockNodes: NetworkNode[] = Array.from({ length: 50 }, (_, i) => ({
      id: `node-${i}`,
      label: `Entity ${i + 1}`,
      type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
      size: Math.random() * 20 + 10,
      color: getNodeColor(
        nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
      ),
      metadata: {
        confidence: Math.random() * 100,
        lastSeen: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ),
        frequency: Math.floor(Math.random() * 100),
        risk: riskLevels[Math.floor(Math.random() * riskLevels.length)],
        centrality: {
          betweenness: Math.random(),
          closeness: Math.random(),
          eigenvector: Math.random(),
          pagerank: Math.random(),
        },
      },
    }));

    // Generate edges
    const edgeTypes: NetworkEdge['type'][] = [
      'communication',
      'transaction',
      'relationship',
      'correlation',
      'hierarchy',
      'temporal',
    ];
    const mockEdges: NetworkEdge[] = Array.from({ length: 80 }, (_, i) => {
      const source = mockNodes[Math.floor(Math.random() * mockNodes.length)];
      const target = mockNodes[Math.floor(Math.random() * mockNodes.length)];

      return {
        id: `edge-${i}`,
        source: source.id,
        target: target.id,
        type: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
        weight: Math.random() * 10,
        metadata: {
          confidence: Math.random() * 100,
          frequency: Math.floor(Math.random() * 50),
          firstSeen: new Date(
            Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
          ),
          lastSeen: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
          ),
          direction: Math.random() > 0.5 ? 'directed' : 'undirected',
        },
      };
    });

    setNodes(mockNodes);
    setEdges(mockEdges);

    // Generate communities
    if (enableCommunityDetection) {
      generateCommunities(mockNodes);
    }

    // Calculate metrics
    calculateNetworkMetrics(mockNodes, mockEdges);
  };

  const getNodeColor = (type: NetworkNode['type']): string => {
    const colors = {
      person: '#ff6b6b',
      organization: '#4ecdc4',
      location: '#45b7d1',
      event: '#96ceb4',
      document: '#feca57',
      ip: '#ff9ff3',
      domain: '#54a0ff',
      hash: '#5f27cd',
    };
    return colors[type];
  };

  const generateCommunities = (nodeList: NetworkNode[]) => {
    const numCommunities = Math.floor(Math.random() * 5) + 3;
    const communityColors = [
      '#ff6b6b',
      '#4ecdc4',
      '#45b7d1',
      '#96ceb4',
      '#feca57',
      '#ff9ff3',
      '#54a0ff',
    ];

    const mockCommunities: CommunityDetection[] = Array.from(
      { length: numCommunities },
      (_, i) => {
        const communitySize = Math.floor(Math.random() * 10) + 5;
        const communityNodes = nodeList
          .slice(i * 7, i * 7 + communitySize)
          .map((n) => n.id);

        return {
          id: `community-${i}`,
          nodes: communityNodes,
          size: communityNodes.length,
          density: Math.random() * 0.5 + 0.3,
          modularity: Math.random() * 0.4 + 0.3,
          color: communityColors[i % communityColors.length],
        };
      },
    );

    setCommunities(mockCommunities);
  };

  const calculateNetworkMetrics = (
    nodeList: NetworkNode[],
    edgeList: NetworkEdge[],
  ) => {
    const networkMetrics: AnalysisMetrics = {
      networkDensity:
        (2 * edgeList.length) / (nodeList.length * (nodeList.length - 1)),
      clusteringCoefficient: Math.random() * 0.5 + 0.2,
      averagePathLength: Math.random() * 3 + 2,
      networkDiameter: Math.floor(Math.random() * 5) + 3,
      modularity: Math.random() * 0.5 + 0.3,
      centralityDistribution: {
        betweenness: { min: 0, max: 1, avg: 0.5 },
        closeness: { min: 0.2, max: 0.8, avg: 0.5 },
        eigenvector: { min: 0, max: 1, avg: 0.4 },
        pagerank: { min: 0.01, max: 0.15, avg: 0.02 },
      },
    };

    setMetrics(networkMetrics);
    onMetricsChange(networkMetrics);
  };

  const updateTemporalData = () => {
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        metadata: {
          ...node.metadata,
          lastSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        },
      })),
    );
  };

  const runCommunityDetection = async () => {
    setIsAnalyzing(true);
    // Simulate analysis delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    generateCommunities(nodes);
    setIsAnalyzing(false);
  };

  const runPathAnalysis = async (sourceId: string, targetId: string) => {
    setIsAnalyzing(true);
    // Simulate path finding
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockPaths: PathAnalysis[] = [
      {
        id: 'path-1',
        source: sourceId,
        target: targetId,
        path: [sourceId, 'node-10', 'node-23', targetId],
        length: 3,
        weight: 8.5,
        type: 'shortest',
      },
      {
        id: 'path-2',
        source: sourceId,
        target: targetId,
        path: [sourceId, 'node-15', 'node-7', 'node-31', targetId],
        length: 4,
        weight: 12.3,
        type: 'strongest',
      },
    ];

    setPathAnalysis(mockPaths);
    mockPaths.forEach((path) => onPathAnalysis(path));
    setIsAnalyzing(false);
  };

  const handleNodeSelection = (nodeIds: string[]) => {
    const selected = nodes.filter((n) => nodeIds.includes(n.id));
    setSelectedNodes(selected);
    onNodeSelect(selected);
  };

  const handleCommunitySelection = (community: CommunityDetection) => {
    setSelectedCommunity(community);
    onCommunitySelect(community);
  };

  return (
    <div className={`advanced-network-analysis ${className}`}>
      {/* Analysis Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Analysis Mode
            </label>
            <select
              value={analysisMode}
              onChange={(e) => setAnalysisMode(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="overview">Overview</option>
              <option value="centrality">Centrality Analysis</option>
              <option value="community">Community Detection</option>
              <option value="paths">Path Analysis</option>
              <option value="temporal">Temporal Analysis</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Layout</label>
            <select
              value={layoutAlgorithm}
              onChange={(e) => setLayoutAlgorithm(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="force">Force-Directed</option>
              <option value="circular">Circular</option>
              <option value="hierarchical">Hierarchical</option>
              <option value="community">Community-Based</option>
            </select>
          </div>

          {analysisMode === 'centrality' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Centrality Type
              </label>
              <select
                value={centralityType}
                onChange={(e) => setCentralityType(e.target.value as any)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="betweenness">Betweenness</option>
                <option value="closeness">Closeness</option>
                <option value="eigenvector">Eigenvector</option>
                <option value="pagerank">PageRank</option>
              </select>
            </div>
          )}

          <div className="flex gap-2">
            {enableCommunityDetection && (
              <button
                onClick={runCommunityDetection}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isAnalyzing ? 'Analyzing...' : 'Detect Communities'}
              </button>
            )}

            <button
              onClick={() => generateMockNetworkData()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {enableTemporalAnalysis && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Temporal Filter:</label>
            <input
              type="date"
              className="px-3 py-2 border rounded-md text-sm"
              onChange={(e) => {
                const start = e.target.value
                  ? new Date(e.target.value)
                  : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                setTemporalFilter((prev) => ({ ...prev, start }));
              }}
            />
            <span>to</span>
            <input
              type="date"
              className="px-3 py-2 border rounded-md text-sm"
              onChange={(e) => {
                const end = e.target.value
                  ? new Date(e.target.value)
                  : new Date();
                setTemporalFilter((prev) => ({ ...prev, end }));
              }}
            />
          </div>
        )}
      </div>

      {/* Main Analysis Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Network Visualization */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border p-4 h-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Network Graph</h3>
              <div className="text-sm text-gray-600">
                {nodes.length} nodes, {edges.length} edges
              </div>
            </div>

            <canvas
              ref={canvasRef}
              className="w-full h-full border rounded"
              style={{ background: '#f8f9fa' }}
            />

            {isAnalyzing && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <div className="text-sm text-gray-600">
                    Running Analysis...
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Panel */}
        <div className="space-y-4">
          {/* Network Metrics */}
          {metrics && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold mb-3">Network Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Density:</span>
                  <span>{metrics.networkDensity.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clustering:</span>
                  <span>{metrics.clusteringCoefficient.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Path:</span>
                  <span>{metrics.averagePathLength.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Diameter:</span>
                  <span>{metrics.networkDiameter}</span>
                </div>
                <div className="flex justify-between">
                  <span>Modularity:</span>
                  <span>{metrics.modularity.toFixed(3)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Communities */}
          {analysisMode === 'community' && communities.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold mb-3">
                Communities ({communities.length})
              </h4>
              <div className="space-y-2">
                {communities.map((community) => (
                  <div
                    key={community.id}
                    onClick={() => handleCommunitySelection(community)}
                    className="p-2 rounded border cursor-pointer hover:bg-gray-50"
                    style={{ borderLeft: `4px solid ${community.color}` }}
                  >
                    <div className="flex justify-between text-sm">
                      <span>Community {community.id.split('-')[1]}</span>
                      <span>{community.size} nodes</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Density: {community.density.toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Path Analysis Results */}
          {pathAnalysis.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold mb-3">Path Analysis</h4>
              <div className="space-y-2">
                {pathAnalysis.map((path) => (
                  <div key={path.id} className="p-2 rounded border">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">
                        {path.type.replace('_', ' ')}
                      </span>
                      <span>Length: {path.length}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Weight: {path.weight.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Nodes Info */}
          {selectedNodes.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold mb-3">
                Selected Nodes ({selectedNodes.length})
              </h4>
              <div className="space-y-2">
                {selectedNodes.slice(0, 5).map((node) => (
                  <div key={node.id} className="p-2 rounded border text-sm">
                    <div className="font-medium">{node.label}</div>
                    <div className="text-xs text-gray-600">
                      {node.type} • Risk: {node.metadata.risk}
                    </div>
                    <div className="text-xs text-gray-600">
                      Confidence: {node.metadata.confidence.toFixed(1)}%
                    </div>
                  </div>
                ))}
                {selectedNodes.length > 5 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{selectedNodes.length - 5} more nodes
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedNetworkAnalysis;
