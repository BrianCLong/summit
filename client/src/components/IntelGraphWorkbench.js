"use strict";
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
exports.IntelGraphWorkbench = IntelGraphWorkbench;
const react_1 = __importStar(require("react"));
const framer_motion_1 = require("framer-motion");
const react_force_graph_2d_1 = __importDefault(require("react-force-graph-2d"));
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const input_1 = require("@/components/ui/input");
const slider_1 = require("@/components/ui/slider");
const label_1 = require("@/components/ui/label");
const tabs_1 = require("@/components/ui/tabs");
const switch_1 = require("@/components/ui/switch");
const separator_1 = require("@/components/ui/separator");
const lucide_react_1 = require("lucide-react");
// Geospatial & DAG layout libs
const react_2 = __importDefault(require("@deck.gl/react"));
const layers_1 = require("@deck.gl/layers");
// @ts-ignore
const react_map_gl_1 = __importStar(require("react-map-gl"));
// @ts-ignore
const maplibre_gl_1 = __importDefault(require("maplibre-gl"));
const material_1 = require("@mui/material");
const urls_1 = require("../config/urls");
// ---- Utilities ----
const palette = [
    '#2563eb',
    '#059669',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#14b8a6',
    '#eab308',
    '#f97316',
    '#22c55e',
    '#06b6d4',
];
const groupBy = (arr, key) => arr.reduce((acc, item) => {
    const groupKey = key(item);
    (acc[groupKey] ||= []).push(item);
    return acc;
}, {});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const by = (arr, key) => groupBy(arr, key);
function louvainLikeCommunities(data) {
    const parent = {};
    const find = (x) => parent[x] ? (parent[x] = find(parent[x])) : (parent[x] = x);
    const union = (a, b) => {
        a = find(a);
        b = find(b);
        if (a !== b)
            parent[b] = a;
    };
    data.links.forEach((e) => union(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    String(e.source.id ?? e.source), 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    String(e.target.id ?? e.target)));
    const res = {};
    data.nodes.forEach((n) => (res[n.id] = find(n.id)));
    return res;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function computeDegrees(data) {
    const deg = {};
    data.nodes.forEach((node) => (deg[node.id] = 0));
    data.links.forEach((link) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (deg[sourceId] !== undefined)
            deg[sourceId]++;
        if (deg[targetId] !== undefined)
            deg[targetId]++;
    });
    return deg;
}
// Placeholder mock data (will be replaced by GraphQL)
const mock = {
    nodes: [
        {
            id: 'node1',
            label: 'Entity A',
            type: 'Person',
            degree: 2,
            ts: 1678886400000,
            group: 'g1',
            lat: 34.0522,
            lon: -118.2437,
        },
        {
            id: 'node2',
            label: 'Entity B',
            type: 'Organization',
            degree: 3,
            ts: 1678972800000,
            group: 'g1',
            lat: 34.0522,
            lon: -118.2437,
        },
        {
            id: 'node3',
            label: 'Entity C',
            type: 'Location',
            degree: 1,
            ts: 1679059200000,
            group: 'g2',
            lat: 34.0522,
            lon: -118.2437,
        },
        {
            id: 'node4',
            label: 'Entity D',
            type: 'Event',
            degree: 2,
            ts: 1679145600000,
            group: 'g1',
            lat: 34.0522,
            lon: -118.2437,
        },
        {
            id: 'node5',
            label: 'Entity E',
            type: 'Person',
            degree: 1,
            ts: 1679232000000,
            group: 'g2',
            lat: 34.0522,
            lon: -118.2437,
        },
    ],
    links: [
        {
            source: 'node1',
            target: 'node2',
            type: 'knows',
            weight: 0.8,
            ts: 1678886400000,
        },
        {
            source: 'node2',
            target: 'node3',
            type: 'located_at',
            weight: 0.5,
            ts: 1678972800000,
        },
        {
            source: 'node1',
            target: 'node4',
            type: 'attended',
            weight: 0.9,
            ts: 1679059200000,
        },
        {
            source: 'node4',
            target: 'node2',
            type: 'involved_in',
            weight: 0.7,
            ts: 1679145600000,
        },
        {
            source: 'node3',
            target: 'node5',
            type: 'related_to',
            weight: 0.6,
            ts: 1679232000000,
        },
    ],
};
// Main component
function IntelGraphWorkbench() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = (0, react_1.useRef)(null);
    const [graphData, setGraphData] = (0, react_1.useState)({
        nodes: [],
        links: [],
    });
    const [selectedNode, setSelectedNode] = (0, react_1.useState)(null);
    const [selectedLink, setSelectedLink] = (0, react_1.useState)(null);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [minDegree, setMinDegree] = (0, react_1.useState)(0);
    const [maxDegree, setMaxDegree] = (0, react_1.useState)(100);
    const [minTimestamp, setMinTimestamp] = (0, react_1.useState)(0);
    const [maxTimestamp, setMaxTimestamp] = (0, react_1.useState)(Date.now());
    const [showMap, setShowMap] = (0, react_1.useState)(false);
    const [layoutType, setLayoutType] = (0, react_1.useState)('force');
    const [isMockMode, setIsMockMode] = (0, react_1.useState)(true); // Default to mock mode for initial development
    // --- NEW: Loading and Error states for GraphQL fetching ---
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [hoverInfo, setHoverInfo] = (0, react_1.useState)(null);
    // --- NEW: GraphQL Query Placeholder ---
    // This is a basic example. You'll need to adjust it based on your actual GraphQL schema.
    // It assumes a query named 'graph' that returns nodes and links.
    const GRAPHQL_QUERY = `
    query GetGraphData {
      graph {
        nodes {
          id
          label
          type
          degree
          ts
          group
          lat
          lon
        }
        links {
          source
          target
          type
          weight
          ts
        }
      }
    }
  `;
    // --- NEW: Function to fetch graph data from GraphQL endpoint ---
    const fetchGraphData = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch((0, urls_1.getGraphqlHttpUrl)(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: GRAPHQL_QUERY }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.errors) {
                throw new Error(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                result.errors.map((err) => err.message).join(', '));
            }
            // Assuming the data structure matches GraphData type
            // Adjust 'result.data.graph' based on your actual GraphQL response structure
            if (result.data && result.data.graph) {
                setGraphData(result.data.graph);
            }
            else {
                setGraphData({ nodes: [], links: [] }); // Set empty if no data
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (e) {
            console.error('Error fetching graph data:', e);
            setError(e.message || 'Failed to fetch graph data.');
            setGraphData({ nodes: [], links: [] }); // Clear graph on error
        }
        finally {
            setLoading(false);
        }
    }, [GRAPHQL_QUERY]); // Recreate if query changes (unlikely for a fixed query)
    // --- MODIFIED: useEffect to load data ---
    (0, react_1.useEffect)(() => {
        if (isMockMode) {
            setGraphData(mock);
            setLoading(false); // Mock data is instant
            setError(null);
        }
        else {
            fetchGraphData();
        }
    }, [isMockMode, fetchGraphData]); // Depend on isMockMode and fetchGraphData
    const handleNodeClick = (0, react_1.useCallback)((node) => {
        setSelectedNode(node);
        setSelectedLink(null); // Clear link selection
        // Center on node
        fgRef.current.centerAndZoom(node.x, node.y, 1000);
    }, []);
    const handleLinkClick = (0, react_1.useCallback)((link) => {
        setSelectedLink(link);
        setSelectedNode(null); // Clear node selection
    }, []);
    const handleSearch = (0, react_1.useCallback)((event) => {
        setSearchQuery(event.target.value);
    }, []);
    const handleDegreeChange = (0, react_1.useCallback)((value) => {
        setMinDegree(value[0]);
        setMaxDegree(value[1]);
    }, []);
    const handleTimestampChange = (0, react_1.useCallback)((value) => {
        setMinTimestamp(value[0]);
        setMaxTimestamp(value[1]);
    }, []);
    const applyLayout = (0, react_1.useCallback)((layout) => {
        setGraphData((prev) => {
            const count = prev.nodes.length || 1;
            if (layout === 'force') {
                return {
                    ...prev,
                    nodes: prev.nodes.map((node) => ({ ...node, fx: undefined, fy: undefined })),
                };
            }
            if (layout === 'radial') {
                const radius = 200;
                return {
                    ...prev,
                    nodes: prev.nodes.map((node, index) => {
                        const angle = (index / count) * Math.PI * 2;
                        return {
                            ...node,
                            fx: Math.cos(angle) * radius,
                            fy: Math.sin(angle) * radius,
                        };
                    }),
                };
            }
            const perRow = Math.max(1, Math.ceil(Math.sqrt(count)));
            const spacing = 140;
            return {
                ...prev,
                nodes: prev.nodes.map((node, index) => {
                    const row = Math.floor(index / perRow);
                    const col = index % perRow;
                    return {
                        ...node,
                        fx: col * spacing,
                        fy: row * spacing,
                    };
                }),
            };
        });
        if (layout === 'force' && fgRef.current) {
            fgRef.current.d3ReheatSimulation();
        }
    }, []);
    (0, react_1.useEffect)(() => {
        if (graphData.nodes.length === 0)
            return;
        applyLayout(layoutType);
    }, [applyLayout, graphData.nodes.length, layoutType]);
    const handleLayoutChange = (0, react_1.useCallback)((value) => {
        setLayoutType(value);
        applyLayout(value);
    }, [applyLayout]);
    const handleToggleMap = (0, react_1.useCallback)(() => {
        setShowMap((prev) => !prev);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!showMap)
            setHoverInfo(null);
    }, [showMap]);
    const formatLinkEndpoint = (endpoint) => {
        if (!endpoint)
            return 'Unknown';
        if (typeof endpoint === 'string')
            return endpoint;
        const node = endpoint;
        return node.label ?? node.id ?? 'Unknown';
    };
    // --- MODIFIED: handleRefresh to re-fetch data if not in mock mode ---
    const handleRefresh = (0, react_1.useCallback)(() => {
        if (!isMockMode) {
            fetchGraphData();
        }
        else {
            setGraphData(mock); // Re-apply mock data
        }
    }, [isMockMode, fetchGraphData]);
    const handleDownloadPNG = (0, react_1.useCallback)(() => {
        if (fgRef.current) {
            fgRef.current.exportImage('image/png', 'intelgraph-workbench.png');
        }
    }, []);
    const filteredGraphData = (0, react_1.useMemo)(() => {
        const filteredNodes = graphData.nodes.filter((node) => {
            const matchesSearch = searchQuery
                ? node.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    node.id.toLowerCase().includes(searchQuery.toLowerCase())
                : true;
            const matchesDegree = (node.degree ?? 0) >= minDegree && (node.degree ?? 0) <= maxDegree;
            const matchesTimestamp = (node.ts ?? 0) >= minTimestamp && (node.ts ?? 0) <= maxTimestamp;
            return matchesSearch && matchesDegree && matchesTimestamp;
        });
        const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));
        const filteredLinks = graphData.links.filter((link) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
        });
        return { nodes: filteredNodes, links: filteredLinks };
    }, [
        graphData,
        searchQuery,
        minDegree,
        maxDegree,
        minTimestamp,
        maxTimestamp,
    ]);
    const nodeColors = (0, react_1.useMemo)(() => {
        const communities = louvainLikeCommunities(filteredGraphData);
        const uniqueGroups = Array.from(new Set(Object.values(communities)));
        return filteredGraphData.nodes.reduce((acc, node) => {
            const group = communities[node.id];
            const colorIndex = uniqueGroups.indexOf(group) % palette.length;
            acc[node.id] = palette[colorIndex];
            return acc;
        }, {});
    }, [filteredGraphData]);
    // --- NEW: Render loading and error messages ---
    if (loading) {
        return (<div className="flex items-center justify-center h-screen w-screen text-lg text-gray-500">
        Loading graph data...
      </div>);
    }
    if (error) {
        return (<div className="flex items-center justify-center h-screen w-screen text-lg text-red-500">
        Error: {error}
        <button_1.Button onClick={handleRefresh} className="ml-4">
          <lucide_react_1.RefreshCw className="h-4 w-4 mr-2"/> Retry
        </button_1.Button>
      </div>);
    }
    return (<div className="flex h-screen w-screen bg-gray-50 text-gray-900">
      {/* Left Panel */}
      <framer_motion_1.motion.div initial={{ x: -300 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} className="w-80 bg-white p-4 shadow-lg flex flex-col z-10">
        <h1 className="text-2xl font-bold mb-4 text-blue-700">
          IntelGraph Workbench
        </h1>

        <tabs_1.Tabs defaultValue="data" className="flex-grow flex flex-col">
          <tabs_1.TabsList className="grid w-full grid-cols-2">
            <tabs_1.TabsTrigger value="data">Data</tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="settings">Settings</tabs_1.TabsTrigger>
          </tabs_1.TabsList>

          <tabs_1.TabsContent value="data" className="flex-grow flex flex-col overflow-y-auto pr-2">
            <div className="mb-4">
              <label_1.Label htmlFor="search">Search Nodes</label_1.Label>
              <input_1.Input id="search" type="text" placeholder="Search by ID or Label..." value={searchQuery} onChange={handleSearch} className="mt-1"/>
            </div>

            <div className="mb-4">
              <label_1.Label>
                Degree Filter ({minDegree} - {maxDegree})
              </label_1.Label>
              <slider_1.Slider min={0} max={graphData.nodes.length > 0
            ? Math.max(...graphData.nodes.map((n) => n.degree || 0))
            : 100} step={1} value={[minDegree, maxDegree]} onValueChange={handleDegreeChange} className="mt-2"/>
            </div>

            <div className="mb-4">
              <label_1.Label>Timeline Filter</label_1.Label>
              <slider_1.Slider min={graphData.nodes.length > 0
            ? Math.min(...graphData.nodes.map((n) => n.ts || 0))
            : 0} max={graphData.nodes.length > 0
            ? Math.max(...graphData.nodes.map((n) => n.ts || 0))
            : Date.now()} step={86400000} // 1 day in milliseconds
     value={[minTimestamp, maxTimestamp]} onValueChange={handleTimestampChange} className="mt-2"/>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{new Date(minTimestamp).toLocaleDateString()}</span>
                <span>{new Date(maxTimestamp).toLocaleDateString()}</span>
              </div>
            </div>

            <separator_1.Separator className="my-4"/>

            <div className="flex items-center justify-between mb-4">
              <label_1.Label htmlFor="mock-mode">Mock Data Mode</label_1.Label>
              <switch_1.Switch id="mock-mode" checked={isMockMode} onCheckedChange={setIsMockMode}/>
            </div>

            <button_1.Button onClick={handleRefresh} className="w-full mb-4">
              <lucide_react_1.RefreshCw className="h-4 w-4 mr-2"/> Refresh Graph
            </button_1.Button>

            <div className="flex-grow overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">
                Selection Inspector
              </h3>
              {selectedNode && (<card_1.Card className="mb-2 bg-blue-50 border-blue-200">
                  <card_1.CardHeader className="p-3 pb-1">
                    <card_1.CardTitle className="text-md text-blue-700">
                      Node: {selectedNode.label || selectedNode.id}
                    </card_1.CardTitle>
                  </card_1.CardHeader>
                  <card_1.CardContent className="p-3 pt-1 text-sm">
                    {Object.entries(selectedNode).map(([key, value]) => (<div key={key}>
                        <span className="font-medium">{key}:</span>{' '}
                        {typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value)}
                      </div>))}
                  </card_1.CardContent>
                </card_1.Card>)}
              {selectedLink && (<card_1.Card className="mb-2 bg-green-50 border-green-200">
                  <card_1.CardHeader className="p-3 pb-1">
                    <card_1.CardTitle className="text-md text-green-700">
                      Link: {selectedLink.type || 'Relationship'}
                    </card_1.CardTitle>
                  </card_1.CardHeader>
                  <card_1.CardContent className="p-3 pt-1 text-sm">
                    <div>
                      <span className="font-medium">Source:</span>{' '}
                      {formatLinkEndpoint(selectedLink.source)}
                    </div>
                    <div>
                      <span className="font-medium">Target:</span>{' '}
                      {formatLinkEndpoint(selectedLink.target)}
                    </div>
                    {Object.entries(selectedLink).map(([key, value]) => 
            // Avoid re-displaying source/target if they are objects
            key !== 'source' &&
                key !== 'target' && (<div key={key}>
                            <span className="font-medium">{key}:</span>{' '}
                            {typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value)}
                          </div>))}
                  </card_1.CardContent>
                </card_1.Card>)}
              {!selectedNode && !selectedLink && (<p className="text-sm text-gray-500">
                  Click on a node or link to inspect.
                </p>)}
            </div>
          </tabs_1.TabsContent>

          <tabs_1.TabsContent value="settings" className="flex-grow flex flex-col overflow-y-auto pr-2">
            <div className="mb-4">
              <label_1.Label htmlFor="layout-type">Graph Layout</label_1.Label>
              <material_1.FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <material_1.InputLabel id="layout-type-label">
                  Graph Layout
                </material_1.InputLabel>
                <material_1.Select labelId="layout-type-label" id="layout-type" value={layoutType} label="Graph Layout" onChange={(event) => handleLayoutChange(event.target.value)}>
                  <material_1.MenuItem value="force">Force-Directed</material_1.MenuItem>
                  <material_1.MenuItem value="dagre">DAG (Hierarchical)</material_1.MenuItem>
                  <material_1.MenuItem value="radial">Radial</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>
            </div>

            <div className="flex items-center justify-between mb-4">
              <label_1.Label htmlFor="show-map">Show Geospatial Map</label_1.Label>
              <switch_1.Switch id="show-map" checked={showMap} onCheckedChange={handleToggleMap}/>
            </div>

            <separator_1.Separator className="my-4"/>

            <button_1.Button onClick={handleDownloadPNG} className="w-full mb-2">
              <lucide_react_1.Download className="h-4 w-4 mr-2"/> Download PNG
            </button_1.Button>
            {/* Add more settings here */}
          </tabs_1.TabsContent>
        </tabs_1.Tabs>
      </framer_motion_1.motion.div>

      {/* Main Graph Area */}
      <div className="flex-grow relative">
        {showMap && (<div className="absolute inset-0 z-0">
            <react_map_gl_1.default mapLib={maplibre_gl_1.default} initialViewState={{
                longitude: -100,
                latitude: 40,
                zoom: 3,
            }} style={{ width: '100%', height: '100%' }} mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" // Example map style
        >
              <react_map_gl_1.NavigationControl position="top-left"/>
              {/* @ts-ignore */}
              <react_2.default initialViewState={{
                longitude: -100,
                latitude: 40,
                zoom: 3,
            }} controller={true} layers={[
                new layers_1.ScatterplotLayer({
                    id: 'nodes-layer',
                    data: filteredGraphData.nodes.filter((n) => n.lat !== undefined && n.lon !== undefined),
                    getPosition: (d) => [d.lon ?? 0, d.lat ?? 0],
                    getFillColor: (d) => {
                        const color = nodeColors[d.id];
                        return color
                            ? [
                                parseInt(color.slice(1, 3), 16),
                                parseInt(color.slice(3, 5), 16),
                                parseInt(color.slice(5, 7), 16),
                                200,
                            ]
                            : [0, 0, 0, 200];
                    },
                    getRadius: 10000, // Adjust radius based on zoom level
                    pickable: true,
                    onHover: ({ object, x, y, }) => {
                        if (!object) {
                            setHoverInfo(null);
                            return;
                        }
                        setHoverInfo({
                            x,
                            y,
                            label: object.label || object.id || 'Node',
                        });
                    },
                    onClick: ({ object }) => {
                        if (object)
                            handleNodeClick(object);
                    },
                }),
                new layers_1.ArcLayer({
                    id: 'links-layer',
                    data: filteredGraphData.links.filter((link) => {
                        const sourceNode = filteredGraphData.nodes.find((n) => n.id ===
                            (typeof link.source === 'object'
                                ? link.source.id
                                : link.source));
                        const targetNode = filteredGraphData.nodes.find((n) => n.id ===
                            (typeof link.target === 'object'
                                ? link.target.id
                                : link.target));
                        return (sourceNode?.lat !== undefined &&
                            sourceNode?.lon !== undefined &&
                            targetNode?.lat !== undefined &&
                            targetNode?.lon !== undefined);
                    }),
                    getSourcePosition: (d) => {
                        const sourceNode = filteredGraphData.nodes.find((n) => n.id ===
                            (typeof d.source === 'object'
                                ? d.source.id
                                : d.source));
                        return sourceNode
                            ? [sourceNode.lon ?? 0, sourceNode.lat ?? 0]
                            : [0, 0];
                    },
                    getTargetPosition: (d) => {
                        const targetNode = filteredGraphData.nodes.find((n) => n.id ===
                            (typeof d.target === 'object'
                                ? d.target.id
                                : d.target));
                        return targetNode
                            ? [targetNode.lon ?? 0, targetNode.lat ?? 0]
                            : [0, 0];
                    },
                    getSourceColor: [0, 128, 255, 160],
                    getTargetColor: [255, 0, 128, 160],
                    getWidth: 2,
                    pickable: true,
                    onHover: ({ object, x, y, }) => {
                        if (!object) {
                            setHoverInfo(null);
                            return;
                        }
                        const label = `${formatLinkEndpoint(object.source)} -> ${formatLinkEndpoint(object.target)}`;
                        setHoverInfo({ x, y, label });
                    },
                    onClick: ({ object }) => {
                        if (object)
                            handleLinkClick(object);
                    },
                }),
            ]}/>
            </react_map_gl_1.default>
            {hoverInfo && (<div style={{
                    position: 'absolute',
                    left: hoverInfo.x,
                    top: hoverInfo.y,
                    transform: 'translate(8px, 8px)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    pointerEvents: 'none',
                    maxWidth: 240,
                }}>
                {hoverInfo.label}
              </div>)}
          </div>)}

        <div className={showMap ? 'opacity-0 pointer-events-none' : ''}>
          <react_force_graph_2d_1.default ref={fgRef} graphData={filteredGraphData} nodeLabel="label" 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeColor={(node) => nodeColors[node.id]} nodeAutoColorBy="group" // Fallback if nodeColors not set
     linkWidth={2} linkDirectionalArrowLength={6} linkDirectionalArrowRelPos={1} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} onBackgroundClick={() => {
            setSelectedNode(null);
            setSelectedLink(null);
        }} 
    // Adjust simulation parameters for better layout
    d3AlphaDecay={0.02} d3VelocityDecay={0.3} enableNodeDrag={true} 
    // Conditional rendering for map overlay
    // If showMap is true, ForceGraph2D should not render nodes/links as they are handled by DeckGL
    // However, ForceGraph2D is still useful for its simulation and controls
    // We might need to hide its visual elements when map is active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeCanvasObject={(node, ctx, globalScale) => {
            if (showMap)
                return; // Don't draw nodes if map is active
            const label = node.label || node.id;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.2); // some padding
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = nodeColors[node.id] || '#000000';
            ctx.fillText(label, node.x, node.y);
            node.__bckgDimensions = bckgDimensions; // for hit testing
        }} 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    linkCanvasObject={(link, ctx, globalScale) => {
            if (showMap)
                return; // Don't draw links if map is active
            // Draw link as before
            const start = link.source;
            const end = link.target;
            if (!start || !end || !start.x || !start.y || !end.x || !end.y)
                return;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1 / globalScale;
            ctx.stroke();
        }} linkCanvasObjectMode={() => 'after'} // Draw links after nodes
    />
        </div>
      </div>
    </div>);
}
