"use strict";
/**
 * KGExplorer - Knowledge Graph Explorer
 * Main component for interactive graph exploration with Cytoscape.js
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KGExplorer = KGExplorer;
const react_1 = __importStar(require("react"));
const cytoscape_1 = __importDefault(require("cytoscape"));
const cytoscape_fcose_1 = __importDefault(require("cytoscape-fcose"));
const cytoscape_dagre_1 = __importDefault(require("cytoscape-dagre"));
const cytoscape_cola_1 = __importDefault(require("cytoscape-cola"));
const cytoscape_edgehandles_1 = __importDefault(require("cytoscape-edgehandles"));
const utils_1 = require("@/lib/utils");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const tabs_1 = require("@/components/ui/tabs");
const types_1 = require("./types");
const useGraphData_1 = require("./useGraphData");
const ExplorerToolbar_1 = require("./ExplorerToolbar");
const EntityPanel_1 = require("./EntityPanel");
const RAGPreviewPanel_1 = require("./RAGPreviewPanel");
const TraversalPanel_1 = require("./TraversalPanel");
const cytoscapeStyles_1 = require("./cytoscapeStyles");
// Register Cytoscape extensions
cytoscape_1.default.use(cytoscape_fcose_1.default);
cytoscape_1.default.use(cytoscape_dagre_1.default);
cytoscape_1.default.use(cytoscape_cola_1.default);
cytoscape_1.default.use(cytoscape_edgehandles_1.default);
function KGExplorer({ investigationId, className, onNodeSelect, onEdgeSelect, enableRAGPreview = true, enableDragTraversal = true, }) {
    const containerRef = (0, react_1.useRef)(null);
    const cyRef = (0, react_1.useRef)(null);
    const ehRef = (0, react_1.useRef)(null);
    // Graph data from GraphQL
    const { cytoscapeElements, nodes, edges, nodeCount, edgeCount, loading, error, refetch, } = (0, useGraphData_1.useGraphData)({ investigationId });
    // Local state
    const [selectedNode, setSelectedNode] = (0, react_1.useState)(null);
    const [selectedEdge, setSelectedEdge] = (0, react_1.useState)(null);
    const [hoveredNode, setHoveredNode] = (0, react_1.useState)(null);
    const [traversalPath, setTraversalPath] = (0, react_1.useState)([]);
    const [layout, setLayout] = (0, react_1.useState)('fcose');
    const [showRAGPreview, setShowRAGPreview] = (0, react_1.useState)(enableRAGPreview);
    const [showTraversalPanel, setShowTraversalPanel] = (0, react_1.useState)(false);
    const [filters, setFilters] = (0, react_1.useState)({
        nodeTypes: [],
        edgeTypes: [],
        minConfidence: 0,
        searchQuery: '',
    });
    // Entity details for selected node
    const { entity: selectedEntityDetails } = (0, useGraphData_1.useEntityDetails)(selectedNode?.id ?? null);
    const { enrichment } = (0, useGraphData_1.useEnrichment)(selectedNode?.id ?? null);
    // Filter elements based on current filters
    const filteredElements = (0, react_1.useMemo)(() => {
        if (!cytoscapeElements.length)
            return [];
        return cytoscapeElements.filter((el) => {
            if ('source' in el.data) {
                // Edge filtering
                if (filters.edgeTypes.length > 0 &&
                    !filters.edgeTypes.includes(el.data.type)) {
                    return false;
                }
                if (filters.minConfidence > 0 &&
                    (el.data.confidence ?? 1) < filters.minConfidence) {
                    return false;
                }
            }
            else {
                // Node filtering
                if (filters.nodeTypes.length > 0 &&
                    !filters.nodeTypes.includes(el.data.type)) {
                    return false;
                }
                if (filters.searchQuery &&
                    !el.data.label.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
                    return false;
                }
            }
            return true;
        });
    }, [cytoscapeElements, filters]);
    // Initialize Cytoscape
    (0, react_1.useEffect)(() => {
        if (!containerRef.current)
            return;
        const cy = (0, cytoscape_1.default)({
            container: containerRef.current,
            elements: [],
            style: (0, cytoscapeStyles_1.getCytoscapeStylesheet)(),
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
            const eh = cy.edgehandles({
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
                complete: (sourceNode, targetNode) => {
                    // Handle drag traversal completion
                    const targetData = targetNode.data();
                    const step = {
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
            const step = {
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
        // Initialize Cytoscape once on mount. Event handlers intentionally use closure
        // to avoid re-initialization on every state change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enableDragTraversal]);
    // Layout function
    const runLayout = (0, react_1.useCallback)((layoutName) => {
        const cy = cyRef.current;
        if (!cy || cy.nodes().length === 0)
            return;
        const layoutOptions = {
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
                concentric: (node) => node.degree(),
                levelWidth: () => 2,
            },
        };
        const opts = (layoutOptions[layoutName] ?? layoutOptions.fcose);
        cy.layout(opts).run();
    }, []);
    // Update elements when data changes
    (0, react_1.useEffect)(() => {
        const cy = cyRef.current;
        if (!cy)
            return;
        // Batch update elements
        cy.batch(() => {
            cy.elements().remove();
            cy.add(filteredElements);
        });
        // Run layout
        if (filteredElements.length > 0) {
            runLayout(layout);
        }
    }, [filteredElements, layout, runLayout]);
    // Zoom controls
    const handleZoomIn = (0, react_1.useCallback)(() => {
        const cy = cyRef.current;
        if (cy)
            cy.zoom(cy.zoom() * 1.2);
    }, []);
    const handleZoomOut = (0, react_1.useCallback)(() => {
        const cy = cyRef.current;
        if (cy)
            cy.zoom(cy.zoom() / 1.2);
    }, []);
    const handleFitGraph = (0, react_1.useCallback)(() => {
        const cy = cyRef.current;
        if (cy)
            cy.fit(undefined, 50);
    }, []);
    const handleCenterSelected = (0, react_1.useCallback)(() => {
        const cy = cyRef.current;
        if (!cy || !selectedNode)
            return;
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
    const handleClearTraversal = (0, react_1.useCallback)(() => {
        setTraversalPath([]);
    }, []);
    // Get unique node and edge types for filters
    const nodeTypes = (0, react_1.useMemo)(() => [...new Set(nodes.map((n) => n.type))], [nodes]);
    const edgeTypes = (0, react_1.useMemo)(() => [...new Set(edges.map((e) => e.type))], [edges]);
    if (error) {
        return (<card_1.Card className={(0, utils_1.cn)('w-full h-full', className)}>
        <card_1.CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-destructive font-medium mb-2">
              Error loading graph data
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message}
            </p>
            <button_1.Button variant="outline" onClick={() => refetch()}>
              Retry
            </button_1.Button>
          </div>
        </card_1.CardContent>
      </card_1.Card>);
    }
    return (<div className={(0, utils_1.cn)('flex flex-col h-full w-full', className)}>
      {/* Toolbar */}
      <ExplorerToolbar_1.ExplorerToolbar layout={layout} onLayoutChange={setLayout} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFitGraph={handleFitGraph} onCenterSelected={handleCenterSelected} onRefresh={() => refetch()} nodeCount={nodeCount} edgeCount={edgeCount} loading={loading} filters={filters} onFiltersChange={setFilters} nodeTypes={nodeTypes} edgeTypes={edgeTypes}/>

      <div className="flex flex-1 overflow-hidden">
        {/* Main graph canvas */}
        <div className="flex-1 relative">
          <div ref={containerRef} className="absolute inset-0 bg-slate-50 dark:bg-slate-900" aria-label="Knowledge graph visualization" role="img"/>

          {/* Loading overlay */}
          {loading && (<div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
                <p className="text-sm text-muted-foreground">Loading graph...</p>
              </div>
            </div>)}

          {/* Empty state */}
          {!loading && nodeCount === 0 && (<div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No entities found
                </p>
                <p className="text-sm text-muted-foreground">
                  Add entities to this investigation to visualize them here
                </p>
              </div>
            </div>)}

          {/* Hover tooltip */}
          {hoveredNode && (<div className="absolute bottom-4 left-4 bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 max-w-xs pointer-events-none z-10">
              <div className="flex items-center gap-2 mb-1">
                <badge_1.Badge style={{
                backgroundColor: types_1.NODE_TYPE_COLORS[hoveredNode.type] ??
                    types_1.NODE_TYPE_COLORS.DEFAULT,
            }}>
                  {hoveredNode.type}
                </badge_1.Badge>
                {hoveredNode.confidence && (<span className="text-xs text-muted-foreground">
                    {Math.round(hoveredNode.confidence * 100)}% confidence
                  </span>)}
              </div>
              <p className="font-medium">{hoveredNode.label}</p>
              {hoveredNode.description && (<p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {hoveredNode.description}
                </p>)}
            </div>)}

          {/* Quick actions */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
            <button_1.Button variant="secondary" size="sm" onClick={() => setShowRAGPreview(!showRAGPreview)} className="shadow-md">
              {showRAGPreview ? 'Hide' : 'Show'} RAG Preview
            </button_1.Button>
            {traversalPath.length > 0 && (<button_1.Button variant="secondary" size="sm" onClick={() => setShowTraversalPanel(!showTraversalPanel)} className="shadow-md">
                Traversal ({traversalPath.length})
              </button_1.Button>)}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-80 lg:w-96 border-l bg-background flex flex-col overflow-hidden">
          <tabs_1.Tabs defaultValue="details" className="flex-1 flex flex-col">
            <tabs_1.TabsList className="w-full justify-start px-4 pt-2 border-b rounded-none">
              <tabs_1.TabsTrigger value="details">Details</tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="rag" disabled={!showRAGPreview}>
                RAG
              </tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="traversal" disabled={traversalPath.length === 0}>
                Path
              </tabs_1.TabsTrigger>
            </tabs_1.TabsList>

            <tabs_1.TabsContent value="details" className="flex-1 overflow-auto p-0 m-0">
              <EntityPanel_1.EntityPanel node={selectedEntityDetails ?? selectedNode} edge={selectedEdge} enrichment={enrichment} onClose={() => {
            setSelectedNode(null);
            setSelectedEdge(null);
        }}/>
            </tabs_1.TabsContent>

            <tabs_1.TabsContent value="rag" className="flex-1 overflow-auto p-0 m-0">
              <RAGPreviewPanel_1.RAGPreviewPanel node={selectedNode} enrichment={enrichment}/>
            </tabs_1.TabsContent>

            <tabs_1.TabsContent value="traversal" className="flex-1 overflow-auto p-0 m-0">
              <TraversalPanel_1.TraversalPanel path={traversalPath} onClear={handleClearTraversal} onStepClick={(step) => {
            const node = nodes.find((n) => n.id === step.nodeId);
            if (node) {
                setSelectedNode(node);
                handleCenterSelected();
            }
        }}/>
            </tabs_1.TabsContent>
          </tabs_1.Tabs>
        </div>
      </div>
    </div>);
}
exports.default = KGExplorer;
