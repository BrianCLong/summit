// Inventory Graph Panel - v1.0
// Attack path preview, hover details, entity links, ownership context, export PNG

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import ForceGraph2D from 'react-force-graph-2d';

// GraphQL queries
const ENTITY_GRAPH_QUERY = gql`
  query EntityGraph($entityId: ID!, $entityType: EntityType!, $depth: Int, $limit: Int) {
    entityGraph(entityId: $entityId, entityType: $entityType, depth: $depth, limit: $limit) {
      centerEntity {
        id
        type
        label
        riskScore
        properties {
          name
          owner
          environment
        }
      }
      nodes {
        id
        type
        label
        riskScore
        criticality
        properties {
          name
          owner
          status
        }
      }
      edges {
        id
        source
        target
        type
        label
        bidirectional
      }
      totalCount
      hasMore
      metadata {
        executionTime
      }
    }
  }
`;

const ATTACK_PATHS_QUERY = gql`
  query AttackPaths($sourceId: ID!, $targetId: ID!, $maxDepth: Int) {
    attackPaths(sourceId: $sourceId, targetId: $targetId, maxDepth: $maxDepth) {
      id
      path {
        id
        type
        label
      }
      edges {
        id
        source
        target
        type
        label
      }
      riskScore
      attackVector
      description
      mitigations
    }
  }
`;

const ENTITY_OWNERSHIP_QUERY = gql`
  query EntityOwnership($entityId: ID!, $entityType: EntityType!) {
    entityOwnership(entityId: $entityId, entityType: $entityType) {
      entity {
        id
        type
        label
      }
      owner {
        id
        name
        email
        slackHandle
      }
      team {
        id
        name
        members {
          id
          name
          email
        }
        oncall {
          id
          name
          email
        }
      }
      responsible {
        id
        name
        email
        role
      }
      handoffLink
      escalationPath {
        name
        role
        email
        phone
        priority
      }
    }
  }
`;

const EXPORT_GRAPH_MUTATION = gql`
  mutation ExportGraph($entityId: ID!, $format: ExportFormat!, $layout: GraphLayout) {
    exportGraph(entityId: $entityId, format: $format, layout: $layout) {
      success
      exportId
      url
      sizeBytes
      expiresAt
    }
  }
`;

interface InventoryGraphPanelProps {
  entityId: string;
  entityType: string;
  alertId?: string;
  showAttackPaths?: boolean;
  showOwnership?: boolean;
}

export const InventoryGraphPanel: React.FC<InventoryGraphPanelProps> = ({
  entityId,
  entityType,
  alertId,
  showAttackPaths = true,
  showOwnership = true
}) => {
  const graphRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [showOwnershipPanel, setShowOwnershipPanel] = useState(false);

  // Query graph data
  const { data: graphData, loading: graphLoading, error: graphError } = useQuery(ENTITY_GRAPH_QUERY, {
    variables: {
      entityId,
      entityType,
      depth: 2,
      limit: 100
    }
  });

  // Query attack paths (if enabled and node selected)
  const { data: pathsData, loading: pathsLoading } = useQuery(ATTACK_PATHS_QUERY, {
    variables: {
      sourceId: entityId,
      targetId: selectedNode?.id || entityId,
      maxDepth: 5
    },
    skip: !showAttackPaths || !selectedNode
  });

  // Query ownership context (if enabled)
  const { data: ownershipData, loading: ownershipLoading } = useQuery(ENTITY_OWNERSHIP_QUERY, {
    variables: {
      entityId: selectedNode?.id || entityId,
      entityType: selectedNode?.type || entityType
    },
    skip: !showOwnership
  });

  // Export mutation
  const [exportGraph, { loading: exportLoading }] = useMutation(EXPORT_GRAPH_MUTATION);

  // Prepare graph data for visualization
  const graphVizData = React.useMemo(() => {
    if (!graphData?.entityGraph) return { nodes: [], links: [] };

    const nodes = graphData.entityGraph.nodes.map((node: any) => ({
      id: node.id,
      name: node.label,
      type: node.type,
      riskScore: node.riskScore,
      criticality: node.criticality,
      properties: node.properties,
      // Color by risk score
      color: getRiskColor(node.riskScore),
      // Size by criticality
      val: getCriticalitySize(node.criticality)
    }));

    const links = graphData.entityGraph.edges.map((edge: any) => ({
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type,
      bidirectional: edge.bidirectional
    }));

    return { nodes, links };
  }, [graphData]);

  // Handle node click
  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    setShowOwnershipPanel(true);
  };

  // Handle node hover
  const handleNodeHover = (node: any) => {
    if (!node) {
      setHighlightedPath([]);
      return;
    }

    // Highlight path from center to hovered node
    const path = findPath(graphVizData, entityId, node.id);
    setHighlightedPath(path);
  };

  // Export graph as PNG
  const handleExport = async () => {
    try {
      const result = await exportGraph({
        variables: {
          entityId,
          format: 'PNG',
          layout: 'FORCE_DIRECTED'
        }
      });

      if (result.data?.exportGraph?.success) {
        const url = result.data.exportGraph.url;
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (graphLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading graph...</div>
      </div>
    );
  }

  if (graphError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <p className="text-red-700">Failed to load graph: {graphError.message}</p>
      </div>
    );
  }

  return (
    <div className="inventory-graph-panel bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Entity Relationship Graph</h3>
          <p className="text-sm text-gray-500">
            {graphData?.entityGraph?.totalCount || 0} entities
            {graphData?.entityGraph?.hasMore && ' (showing subset)'}
            {' • '}
            Rendered in {graphData?.entityGraph?.metadata?.executionTime?.toFixed(2)}s
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {exportLoading ? 'Exporting...' : 'Export PNG'}
          </button>
          <button
            onClick={() => setShowOwnershipPanel(!showOwnershipPanel)}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            {showOwnershipPanel ? 'Hide' : 'Show'} Ownership
          </button>
        </div>
      </div>

      {/* Graph visualization */}
      <div className="relative">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphVizData}
          nodeLabel="name"
          nodeColor="color"
          nodeVal="val"
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          linkColor={(link: any) =>
            highlightedPath.includes(link.source.id) && highlightedPath.includes(link.target.id)
              ? '#3b82f6'
              : '#d1d5db'
          }
          linkWidth={(link: any) =>
            highlightedPath.includes(link.source.id) && highlightedPath.includes(link.target.id)
              ? 3
              : 1
          }
          nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
            // Custom node rendering with labels
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            // Draw circle
            ctx.fillStyle = node.color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val || 5, 0, 2 * Math.PI);
            ctx.fill();

            // Draw label background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(
              node.x - bckgDimensions[0] / 2,
              node.y + (node.val || 5) + 2,
              bckgDimensions[0],
              bckgDimensions[1]
            );

            // Draw label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#1f2937';
            ctx.fillText(label, node.x, node.y + (node.val || 5) + 2 + fontSize / 2);
          }}
          width={800}
          height={500}
        />

        {/* Node hover details */}
        {selectedNode && (
          <div className="absolute top-4 right-4 bg-white border rounded shadow-lg p-4 w-64">
            <h4 className="font-semibold mb-2">{selectedNode.name}</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Risk Score:</span>
                <span className={`font-medium ${getRiskClass(selectedNode.riskScore)}`}>
                  {selectedNode.riskScore?.toFixed(1) || 'N/A'}
                </span>
              </div>
              {selectedNode.properties?.owner && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Owner:</span>
                  <span className="font-medium">{selectedNode.properties.owner}</span>
                </div>
              )}
              {selectedNode.properties?.environment && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Environment:</span>
                  <span className="font-medium">{selectedNode.properties.environment}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t">
              <a
                href={`/entities/${selectedNode.id}`}
                className="text-blue-600 hover:underline text-sm"
              >
                View entity details →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Attack paths preview */}
      {showAttackPaths && pathsData?.attackPaths && pathsData.attackPaths.length > 0 && (
        <div className="border-t px-4 py-3">
          <h4 className="font-semibold mb-2">Attack Paths ({pathsData.attackPaths.length})</h4>
          <div className="space-y-2">
            {pathsData.attackPaths.slice(0, 3).map((path: any) => (
              <div key={path.id} className="bg-gray-50 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{path.attackVector}</span>
                  <span className={`text-xs px-2 py-1 rounded ${getRiskClass(path.riskScore)}`}>
                    Risk: {path.riskScore.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{path.description}</p>
                {path.mitigations && path.mitigations.length > 0 && (
                  <div className="mt-1 text-xs text-blue-600">
                    {path.mitigations.length} mitigation{path.mitigations.length > 1 ? 's' : ''} available
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ownership panel */}
      {showOwnershipPanel && ownershipData?.entityOwnership && (
        <div className="border-t px-4 py-3 bg-gray-50">
          <h4 className="font-semibold mb-3">Ownership Context</h4>

          {ownershipData.entityOwnership.owner && (
            <div className="mb-3">
              <h5 className="text-sm font-medium text-gray-700 mb-1">Owner</h5>
              <div className="text-sm">
                <div>{ownershipData.entityOwnership.owner.name}</div>
                <div className="text-gray-600">{ownershipData.entityOwnership.owner.email}</div>
                {ownershipData.entityOwnership.owner.slackHandle && (
                  <div className="text-blue-600">
                    @{ownershipData.entityOwnership.owner.slackHandle}
                  </div>
                )}
              </div>
            </div>
          )}

          {ownershipData.entityOwnership.team && (
            <div className="mb-3">
              <h5 className="text-sm font-medium text-gray-700 mb-1">Team</h5>
              <div className="text-sm">
                <div>{ownershipData.entityOwnership.team.name}</div>
                {ownershipData.entityOwnership.team.oncall && (
                  <div className="text-gray-600">
                    On-call: {ownershipData.entityOwnership.team.oncall.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {ownershipData.entityOwnership.escalationPath &&
           ownershipData.entityOwnership.escalationPath.length > 0 && (
            <div className="mb-3">
              <h5 className="text-sm font-medium text-gray-700 mb-1">Escalation Path</h5>
              <div className="space-y-1">
                {ownershipData.entityOwnership.escalationPath.map((contact: any, idx: number) => (
                  <div key={idx} className="text-sm flex items-center gap-2">
                    <span className="text-gray-500">{contact.priority}.</span>
                    <span>{contact.name}</span>
                    <span className="text-gray-600">({contact.role})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ownershipData.entityOwnership.handoffLink && (
            <a
              href={ownershipData.entityOwnership.handoffLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              View handoff documentation →
            </a>
          )}
        </div>
      )}
    </div>
  );
};

// Helper functions

function getRiskColor(riskScore: number | null): string {
  if (!riskScore) return '#9ca3af';
  if (riskScore >= 80) return '#dc2626';
  if (riskScore >= 60) return '#ea580c';
  if (riskScore >= 40) return '#f59e0b';
  if (riskScore >= 20) return '#10b981';
  return '#3b82f6';
}

function getRiskClass(riskScore: number | null): string {
  if (!riskScore) return 'text-gray-500';
  if (riskScore >= 80) return 'text-red-600 bg-red-50';
  if (riskScore >= 60) return 'text-orange-600 bg-orange-50';
  if (riskScore >= 40) return 'text-yellow-600 bg-yellow-50';
  return 'text-green-600 bg-green-50';
}

function getCriticalitySize(criticality: string | null): number {
  const sizes: Record<string, number> = {
    'critical': 12,
    'high': 10,
    'medium': 8,
    'low': 6
  };
  return sizes[criticality || 'medium'] || 8;
}

function findPath(graphData: any, sourceId: string, targetId: string): string[] {
  // Simple BFS to find path
  const visited = new Set<string>();
  const queue: { id: string; path: string[] }[] = [{ id: sourceId, path: [sourceId] }];

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    if (id === targetId) {
      return path;
    }

    if (visited.has(id)) continue;
    visited.add(id);

    const neighbors = graphData.links
      .filter((link: any) => link.source.id === id || link.target.id === id)
      .map((link: any) => link.source.id === id ? link.target.id : link.source.id);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({ id: neighbor, path: [...path, neighbor] });
      }
    }
  }

  return [];
}

export default InventoryGraphPanel;
