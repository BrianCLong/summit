/**
 * KGExplorer - Knowledge Graph Explorer
 * Main component for interactive graph exploration with Cytoscape.js
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import dagre from 'cytoscape-dagre';
import cola from 'cytoscape-cola';
import edgehandles from 'cytoscape-edgehandles';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  GraphNode,
  GraphEdge,
  CytoscapeElement,
  TraversalStep,
  NODE_TYPE_COLORS,
  LAYOUT_OPTIONS,
  ExplorerFilters,
} from './types';
import { useGraphData, useEntityDetails, useEnrichment } from './useGraphData';
import { ExplorerToolbar } from './ExplorerToolbar';
import { EntityPanel } from './EntityPanel';
import { RAGPreviewPanel } from './RAGPreviewPanel';
import { TraversalPanel } from './TraversalPanel';
import { getCytoscapeStylesheet } from './cytoscapeStyles';

// Register Cytoscape extensions
cytoscape.use(fcose);
cytoscape.use(dagre);
cytoscape.use(cola);
cytoscape.use(edgehandles);

export interface KGExplorerProps {
  investigationId: string;
  className?: string;
  onNodeSelect?: (node: GraphNode | null) => void;
  onEdgeSelect?: (edge: GraphEdge | null) => void;
  enableRAGPreview?: boolean;
  enableDragTraversal?: boolean;
}

export function KGExplorer({
  investigationId,
  className,
  onNodeSelect,
  onEdgeSelect,
  enableRAGPreview = true,
  enableDragTraversal = true,
}: KGExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const ehRef = useRef<ReturnType<typeof edgehandles> | null>(null);

  // Graph data from GraphQL
  const {
    cytoscapeElements,
    nodes,
    edges,
    nodeCount,
    edgeCount,
    loading,
    error,
    refetch,
  } = useGraphData({ investigationId });

  // Local state
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [traversalPath, setTraversalPath] = useState<TraversalStep[]>([]);
  const [layout, setLayout] = useState('fcose');
  const [showRAGPreview, setShowRAGPreview] = useState(enableRAGPreview);
  const [showTraversalPanel, setShowTraversalPanel] = useState(false);
  const [filters, setFilters] = useState<ExplorerFilters>({
    nodeTypes: [],
    edgeTypes: [],
    minConfidence: 0,
    searchQuery: '',
  });

  // Entity details for selected node
  const { entity: selectedEntityDetails } = useEntityDetails(
    selectedNode?.id ?? null,
  );
  const { enrichment } = useEnrichment(selectedNode?.id ?? null);

  // Filter elements based on current filters
  const filteredElements = useMemo(() => {
    if (!cytoscapeElements.length) return [];

    return cytoscapeElements.filter((el) => {
      if ('source' in el.data) {
        // Edge filtering
        if (
          filters.edgeTypes.length > 0 &&
          !filters.edgeTypes.includes(el.data.type)
        ) {
          return false;
        }
        if (
          filters.minConfidence > 0 &&
          (el.data.confidence ?? 1) < filters.minConfidence
        ) {
          return false;
        }
      } else {
        // Node filtering
        if (
          filters.nodeTypes.length > 0 &&
          !filters.nodeTypes.includes(el.data.type)
        ) {
          return false;
        }
        if (
          filters.searchQuery &&
          !el.data.label.toLowerCase().includes(filters.searchQuery.toLowerCase())
        ) {
          return false;
        }
      }
      return true;
    });
  }, [cytoscapeElements, filters]);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: getCytoscapeStylesheet(),
      layout: { name: 'preset' },
      minZoom: 0.1,
      maxZoom: 4,
      wheelSensitivity: 0.3,
      boxSelectionEnabled: true,
      selectionType: 'single',
    });

    cyRef.current = cy;

    // Initialize edge handles for drag-to-traverse
    if (enableDragTraversal) {
      const eh = (cy as any).edgehandles({
        preview: true,
        hoverDelay: 150,
        handleNodes: 'node',
        snap: true,
        snapThreshold: 50,
        snapFrequency: 15,
        noEdgeEventsInDraw: true,
        disableBrowserGestures: true,
        handlePosition: () => 'middle top',
        handleInDrawMode: false,
        edgeType: () => 'flat',
        loopAllowed: () => false,
        nodeLoopOffset: -50,
        complete: (
          sourceNode: NodeSingular,
          targetNode: NodeSingular,
        ) => {
          // Handle drag traversal completion
          const sourceData = sourceNode.data();
          const targetData = targetNode.data();

          const step: TraversalStep = {
            nodeId: targetData.id,
            nodeLabel: targetData.label,
            nodeType: targetData.type,
            direction: 'outgoing',
            depth: traversalPath.length + 1,
          };

          setTraversalPath((prev) => [...prev, step]);
          setShowTraversalPanel(true);
        },
      });

      ehRef.current = eh;
    }

    // Event handlers
    cy.on('tap', 'node', (e) => {
      const nodeData = e.target.data();
      const node = nodes.find((n) => n.id === nodeData.id) ?? null;
      setSelectedNode(node);
      setSelectedEdge(null);
      onNodeSelect?.(node);
    });

    cy.on('tap', 'edge', (e) => {
      const edgeData = e.target.data();
      const edge = edges.find((ed) => ed.id === edgeData.id) ?? null;
      setSelectedNode(null);
      setSelectedEdge(edge);
      onEdgeSelect?.(edge);
    });

    cy.on('tap', (e) => {
      if (e.target === cy) {
        setSelectedNode(null);
        setSelectedEdge(null);
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
      }
    });

    cy.on('mouseover', 'node', (e) => {
      const nodeData = e.target.data();
      const node = nodes.find((n) => n.id === nodeData.id) ?? null;
      setHoveredNode(node);
      e.target.addClass('hover');
    });

    cy.on('mouseout', 'node', (e) => {
      setHoveredNode(null);
      e.target.removeClass('hover');
    });

    // Double-click to expand node
    cy.on('dbltap', 'node', (e) => {
      const nodeData = e.target.data();
      const step: TraversalStep = {
        nodeId: nodeData.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.type,
        direction: 'both',
        depth: traversalPath.length + 1,
      };
      setTraversalPath((prev) => [...prev, step]);
      setShowTraversalPanel(true);
    });

    return () => {
      cy.destroy();
    };
  }, [enableDragTraversal]);

  // Update elements when data changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Batch update elements
    cy.batch(() => {
      cy.elements().remove();
      cy.add(filteredElements as any);
    });

    // Run layout
    if (filteredElements.length > 0) {
      runLayout(layout);
    }
  }, [filteredElements, layout]);

  // Layout function
  const runLayout = useCallback(
    (layoutName: string) => {
      const cy = cyRef.current;
      if (!cy || cy.nodes().length === 0) return;

      const layoutOptions: Record<string, object> = {
        fcose: {
          name: 'fcose',
          quality: 'default',
          animate: true,
          animationDuration: 500,
          randomize: true,
          fit: true,
          padding: 50,
          nodeDimensionsIncludeLabels: true,
          uniformNodeDimensions: false,
          packComponents: true,
          nodeRepulsion: 4500,
          idealEdgeLength: 100,
          edgeElasticity: 0.45,
          nestingFactor: 0.1,
          numIter: 2500,
          tile: true,
          tilingPaddingVertical: 10,
          tilingPaddingHorizontal: 10,
          gravity: 0.25,
          gravityRange: 3.8,
        },
        dagre: {
          name: 'dagre',
          rankDir: 'TB',
          align: 'UL',
          ranker: 'network-simplex',
          nodeSep: 50,
          edgeSep: 10,
          rankSep: 75,
          animate: true,
          animationDuration: 500,
          fit: true,
          padding: 50,
        },
        cola: {
          name: 'cola',
          animate: true,
          animationDuration: 500,
          fit: true,
          padding: 50,
          nodeDimensionsIncludeLabels: true,
          avoidOverlap: true,
          unconstrIter: 10,
          userConstIter: 10,
          allConstIter: 10,
          convergenceThreshold: 0.01,
        },
        circle: {
          name: 'circle',
          fit: true,
          padding: 50,
          animate: true,
          animationDuration: 500,
          avoidOverlap: true,
          startAngle: (3 / 2) * Math.PI,
          sweep: 2 * Math.PI,
          clockwise: true,
        },
        concentric: {
          name: 'concentric',
          fit: true,
          padding: 50,
          animate: true,
          animationDuration: 500,
          avoidOverlap: true,
          minNodeSpacing: 50,
          concentric: (node: NodeSingular) => node.degree(),
          levelWidth: () => 2,
        },
      };

      const opts = layoutOptions[layoutName] ?? layoutOptions.fcose;
      cy.layout(opts).run();
    },
    [],
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.zoom(cy.zoom() * 1.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.zoom(cy.zoom() / 1.2);
  }, []);

  const handleFitGraph = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.fit(undefined, 50);
  }, []);

  const handleCenterSelected = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || !selectedNode) return;
    const node = cy.getElementById(selectedNode.id);
    if (node.length) {
      cy.animate({
        center: { eles: node },
        zoom: 1.5,
        duration: 500,
      });
    }
  }, [selectedNode]);

  // Clear traversal path
  const handleClearTraversal = useCallback(() => {
    setTraversalPath([]);
  }, []);

  // Get unique node and edge types for filters
  const nodeTypes = useMemo(
    () => [...new Set(nodes.map((n) => n.type))],
    [nodes],
  );
  const edgeTypes = useMemo(
    () => [...new Set(edges.map((e) => e.type))],
    [edges],
  );

  if (error) {
    return (
      <Card className={cn('w-full h-full', className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-destructive font-medium mb-2">
              Error loading graph data
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      {/* Toolbar */}
      <ExplorerToolbar
        layout={layout}
        onLayoutChange={setLayout}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitGraph={handleFitGraph}
        onCenterSelected={handleCenterSelected}
        onRefresh={() => refetch()}
        nodeCount={nodeCount}
        edgeCount={edgeCount}
        loading={loading}
        filters={filters}
        onFiltersChange={setFilters}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main graph canvas */}
        <div className="flex-1 relative">
          <div
            ref={containerRef}
            className="absolute inset-0 bg-slate-50 dark:bg-slate-900"
            aria-label="Knowledge graph visualization"
            role="img"
          />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading graph...</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && nodeCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No entities found
                </p>
                <p className="text-sm text-muted-foreground">
                  Add entities to this investigation to visualize them here
                </p>
              </div>
            </div>
          )}

          {/* Hover tooltip */}
          {hoveredNode && (
            <div className="absolute bottom-4 left-4 bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 max-w-xs pointer-events-none z-10">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  style={{
                    backgroundColor:
                      NODE_TYPE_COLORS[hoveredNode.type] ??
                      NODE_TYPE_COLORS.DEFAULT,
                  }}
                >
                  {hoveredNode.type}
                </Badge>
                {hoveredNode.confidence && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(hoveredNode.confidence * 100)}% confidence
                  </span>
                )}
              </div>
              <p className="font-medium">{hoveredNode.label}</p>
              {hoveredNode.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {hoveredNode.description}
                </p>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowRAGPreview(!showRAGPreview)}
              className="shadow-md"
            >
              {showRAGPreview ? 'Hide' : 'Show'} RAG Preview
            </Button>
            {traversalPath.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowTraversalPanel(!showTraversalPanel)}
                className="shadow-md"
              >
                Traversal ({traversalPath.length})
              </Button>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-80 lg:w-96 border-l bg-background flex flex-col overflow-hidden">
          <Tabs defaultValue="details" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start px-4 pt-2 border-b rounded-none">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="rag" disabled={!showRAGPreview}>
                RAG
              </TabsTrigger>
              <TabsTrigger
                value="traversal"
                disabled={traversalPath.length === 0}
              >
                Path
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-auto p-0 m-0">
              <EntityPanel
                node={selectedEntityDetails ?? selectedNode}
                edge={selectedEdge}
                enrichment={enrichment}
                onClose={() => {
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
              />
            </TabsContent>

            <TabsContent value="rag" className="flex-1 overflow-auto p-0 m-0">
              <RAGPreviewPanel
                node={selectedNode}
                enrichment={enrichment}
              />
            </TabsContent>

            <TabsContent value="traversal" className="flex-1 overflow-auto p-0 m-0">
              <TraversalPanel
                path={traversalPath}
                onClear={handleClearTraversal}
                onStepClick={(step) => {
                  const node = nodes.find((n) => n.id === step.nodeId);
                  if (node) {
                    setSelectedNode(node);
                    handleCenterSelected();
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default KGExplorer;
