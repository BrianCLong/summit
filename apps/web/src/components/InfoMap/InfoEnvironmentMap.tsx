import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

interface InfoNode {
  id: string;
  label: string;
  type: 'media_outlet' | 'social_platform' | 'forum' | 'influencer';
  influenceScore: number;
  connections: string[];
  metadata: Record<string, any>;
}

interface GraphData {
  nodes: { id: string; name: string; val: number; color: string }[];
  links: { source: string; target: string }[];
}

export const InfoEnvironmentMap: React.FC = () => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const fgRef = useRef<ForceGraphMethods>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Mock API call - in real implementation use:
      // const res = await fetch('/api/infomap/nodes');
      // const json = await res.json();

      // For visual prototype, we can assume the endpoint is working or use local state if CORS/auth issues in dev
      const response = await fetch('/api/infomap/nodes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assumes auth token is stored
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch nodes');
      }

      const result = await response.json();
      if (result.success && result.data) {
        transformData(result.data);
      }
    } catch (error) {
      console.error('Error fetching InfoMap data:', error);
      // Fallback for demo if API fails
      setLoading(false);
    }
  };

  const transformData = (nodes: InfoNode[]) => {
    const graphNodes = nodes.map(n => ({
      id: n.id,
      name: n.label,
      val: n.influenceScore / 10, // Scale for visual size
      color: getNodeColor(n.type),
      ...n
    }));

    const graphLinks: { source: string; target: string }[] = [];
    nodes.forEach(n => {
      n.connections.forEach(targetId => {
        // Only add link if target exists in our node set to avoid crashes
        if (nodes.find(target => target.id === targetId)) {
          graphLinks.push({ source: n.id, target: targetId });
        }
      });
    });

    setData({ nodes: graphNodes, links: graphLinks });
    setLoading(false);
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'media_outlet': return '#4ade80'; // Green
      case 'social_platform': return '#3b82f6'; // Blue
      case 'forum': return '#f59e0b'; // Amber
      case 'influencer': return '#ef4444'; // Red
      default: return '#9ca3af'; // Gray
    }
  };

  if (loading) return <div className="p-4">Loading Information Environment...</div>;

  return (
    <div className="w-full h-full min-h-[600px] border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
      <div className="absolute p-4 z-10">
        <h2 className="text-xl font-bold text-white mb-2">InfoMap: Global Influence Ecosystem</h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-400 mr-2"></span>Media</div>
          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>Platform</div>
          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>Forum</div>
          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>Influencer</div>
        </div>
      </div>
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        nodeLabel="name"
        nodeColor="color"
        backgroundColor="#111827"
        linkColor={() => "#374151"}
        onNodeClick={(node: any) => {
          fgRef.current?.centerAt(node.x, node.y, 1000);
          fgRef.current?.zoom(2, 2000);
        }}
      />
    </div>
  );
};

export default InfoEnvironmentMap;
