"use strict";
/**
 * Advanced Graph Interactions Component
 * Enhanced graph analysis and manipulation tools for IntelGraph
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedGraphInteractions = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
// Mock data generators
const generateAnalysisMetrics = () => [
    {
        name: 'Network Density',
        value: 0.23,
        description: 'Proportion of edges to possible connections',
        category: 'structure',
    },
    {
        name: 'Clustering Coefficient',
        value: 0.67,
        description: 'Tendency of nodes to cluster together',
        category: 'structure',
    },
    {
        name: 'Average Path Length',
        value: 3.2,
        description: 'Average shortest path between all node pairs',
        category: 'connectivity',
    },
    {
        name: 'Betweenness Centrality',
        value: 0.45,
        description: 'Nodes acting as bridges between communities',
        category: 'centrality',
    },
    {
        name: 'PageRank Score',
        value: 0.78,
        description: 'Node importance based on connection quality',
        category: 'centrality',
    },
];
const generateClusteringResults = () => ({
    clusters: {
        0: [
            {
                id: '1',
                label: 'Person A',
                type: 'person',
                properties: {},
                centrality: 0.8,
            },
            {
                id: '2',
                label: 'Company X',
                type: 'organization',
                properties: {},
                centrality: 0.6,
            },
        ],
        1: [
            {
                id: '3',
                label: 'Location Y',
                type: 'location',
                properties: {},
                centrality: 0.4,
            },
            {
                id: '4',
                label: 'Event Z',
                type: 'event',
                properties: {},
                centrality: 0.5,
            },
        ],
    },
    modularity: 0.73,
    algorithm: 'Louvain',
});
const AdvancedGraphInteractions = ({ nodes = [], edges = [], onNodeSelect, onEdgeSelect, onLayoutChange, onAnalysisRun, enableAdvancedFeatures = true, }) => {
    const [activeTab, setActiveTab] = (0, react_1.useState)(0);
    const [selectedLayout, setSelectedLayout] = (0, react_1.useState)('force-directed');
    const [analysisMetrics, setAnalysisMetrics] = (0, react_1.useState)(generateAnalysisMetrics());
    const [clusteringResults, setClusteringResults] = (0, react_1.useState)(null);
    const [isAnalyzing, setIsAnalyzing] = (0, react_1.useState)(false);
    const [filters, setFilters] = (0, react_1.useState)({
        nodeTypes: new Set(['person', 'organization', 'location']),
        edgeTypes: new Set(['knows', 'works_at', 'located_at']),
        centralityThreshold: 0.3,
        showClusters: false,
    });
    // Clustering analysis
    const runClustering = (0, react_1.useCallback)(async () => {
        setIsAnalyzing(true);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate analysis
        const results = generateClusteringResults();
        setClusteringResults(results);
        setIsAnalyzing(false);
        onAnalysisRun?.('clustering', { algorithm: 'louvain' });
    }, [onAnalysisRun]);
    // Layout algorithms
    const layoutOptions = [
        { value: 'force-directed', label: 'Force Directed', icon: <icons_material_1.Hub /> },
        { value: 'hierarchical', label: 'Hierarchical', icon: <icons_material_1.AccountTree /> },
        { value: 'circular', label: 'Circular', icon: <icons_material_1.BubbleChart /> },
        { value: 'grid', label: 'Grid', icon: <icons_material_1.ScatterPlot /> },
    ];
    const handleLayoutChange = (layout) => {
        setSelectedLayout(layout);
        onLayoutChange?.(layout);
    };
    const handleFilterChange = (filterType, value) => {
        setFilters((prev) => ({
            ...prev,
            [filterType]: value,
        }));
    };
    const NetworkMetricsPanel = () => (<material_1.Box>
      <material_1.Typography variant="h6" sx={{ mb: 2 }}>
        Network Analysis
      </material_1.Typography>

      <material_1.Stack spacing={2}>
        {analysisMetrics.map((metric, index) => (<material_1.Card key={index} variant="outlined">
            <material_1.CardContent sx={{ p: 2 }}>
              <material_1.Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
            }}>
                <material_1.Typography variant="subtitle2">{metric.name}</material_1.Typography>
                <material_1.Chip size="small" label={metric.category} color={metric.category === 'centrality'
                ? 'primary'
                : metric.category === 'structure'
                    ? 'secondary'
                    : 'info'}/>
              </material_1.Box>

              <material_1.Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                {typeof metric.value === 'number'
                ? metric.value.toFixed(2)
                : metric.value}
              </material_1.Typography>

              <material_1.Typography variant="caption" color="text.secondary">
                {metric.description}
              </material_1.Typography>
            </material_1.CardContent>
          </material_1.Card>))}

        <material_1.Button variant="contained" onClick={runClustering} disabled={isAnalyzing} startIcon={isAnalyzing ? <icons_material_1.Memory /> : <icons_material_1.Analytics />} fullWidth>
          {isAnalyzing ? 'Analyzing...' : 'Run Community Detection'}
        </material_1.Button>

        {clusteringResults && (<material_1.Alert severity="success">
            <material_1.Typography variant="body2">
              Found {Object.keys(clusteringResults.clusters).length} communities
              with modularity score of {clusteringResults.modularity.toFixed(3)}
            </material_1.Typography>
          </material_1.Alert>)}
      </material_1.Stack>
    </material_1.Box>);
    const FilterPanel = () => (<material_1.Box>
      <material_1.Typography variant="h6" sx={{ mb: 2 }}>
        Filters & View
      </material_1.Typography>

      <material_1.Stack spacing={3}>
        <material_1.FormControl>
          <material_1.InputLabel>Layout Algorithm</material_1.InputLabel>
          <material_1.Select value={selectedLayout} label="Layout Algorithm" onChange={(e) => handleLayoutChange(e.target.value)}>
            {layoutOptions.map((option) => (<material_1.MenuItem key={option.value} value={option.value}>
                <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {option.icon}
                  {option.label}
                </material_1.Box>
              </material_1.MenuItem>))}
          </material_1.Select>
        </material_1.FormControl>

        <material_1.Box>
          <material_1.Typography variant="subtitle2" sx={{ mb: 2 }}>
            Centrality Threshold: {filters.centralityThreshold}
          </material_1.Typography>
          <material_1.Slider value={filters.centralityThreshold} onChange={(_, value) => handleFilterChange('centralityThreshold', value)} min={0} max={1} step={0.1} marks={[
            { value: 0, label: '0' },
            { value: 0.5, label: '0.5' },
            { value: 1, label: '1' },
        ]}/>
        </material_1.Box>

        <material_1.FormControlLabel control={<material_1.Switch checked={filters.showClusters} onChange={(e) => handleFilterChange('showClusters', e.target.checked)}/>} label="Show Communities"/>

        <material_1.Box>
          <material_1.Typography variant="subtitle2" sx={{ mb: 1 }}>
            Node Types
          </material_1.Typography>
          <material_1.Stack direction="row" spacing={1} flexWrap="wrap">
            {['person', 'organization', 'location', 'event'].map((type) => (<material_1.Chip key={type} label={type} variant={filters.nodeTypes.has(type) ? 'filled' : 'outlined'} onClick={() => {
                const newTypes = new Set(filters.nodeTypes);
                if (newTypes.has(type)) {
                    newTypes.delete(type);
                }
                else {
                    newTypes.add(type);
                }
                handleFilterChange('nodeTypes', newTypes);
            }} size="small"/>))}
          </material_1.Stack>
        </material_1.Box>
      </material_1.Stack>
    </material_1.Box>);
    const ClusteringPanel = () => (<material_1.Box>
      <material_1.Typography variant="h6" sx={{ mb: 2 }}>
        Community Analysis
      </material_1.Typography>

      {isAnalyzing && <material_1.LinearProgress sx={{ mb: 2 }}/>}

      {clusteringResults ? (<material_1.Stack spacing={2}>
          <material_1.Alert severity="info">
            <material_1.Typography variant="body2">
              Detected {Object.keys(clusteringResults.clusters).length}{' '}
              communities using {clusteringResults.algorithm} algorithm
            </material_1.Typography>
          </material_1.Alert>

          {Object.entries(clusteringResults.clusters).map(([clusterId, clusterNodes]) => (<material_1.Accordion key={clusterId}>
                <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                  <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <material_1.Badge badgeContent={clusterNodes.length} color="primary">
                      <icons_material_1.Hub />
                    </material_1.Badge>
                    <material_1.Typography>Community {parseInt(clusterId) + 1}</material_1.Typography>
                  </material_1.Box>
                </material_1.AccordionSummary>
                <material_1.AccordionDetails>
                  <material_1.Stack spacing={1}>
                    {clusterNodes.map((node) => (<material_1.Box key={node.id} sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                    }} onClick={() => onNodeSelect?.(node.id)}>
                        <material_1.Box>
                          <material_1.Typography variant="body2">{node.label}</material_1.Typography>
                          <material_1.Typography variant="caption" color="text.secondary">
                            {node.type}
                          </material_1.Typography>
                        </material_1.Box>
                        <material_1.Chip size="small" label={`${(node.centrality * 100).toFixed(0)}%`} variant="outlined"/>
                      </material_1.Box>))}
                  </material_1.Stack>
                </material_1.AccordionDetails>
              </material_1.Accordion>))}
        </material_1.Stack>) : (<material_1.Alert severity="info">
          Run community detection analysis to identify node clusters and
          relationships.
        </material_1.Alert>)}
    </material_1.Box>);
    return (<material_1.Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <material_1.Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
          <material_1.Box>
            <material_1.Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Advanced Graph Analysis
            </material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              {nodes.length} nodes, {edges.length} edges
            </material_1.Typography>
          </material_1.Box>

          <material_1.ButtonGroup variant="outlined">
            <material_1.Tooltip title="Zoom In">
              <material_1.Button>
                <icons_material_1.ZoomIn />
              </material_1.Button>
            </material_1.Tooltip>
            <material_1.Tooltip title="Zoom Out">
              <material_1.Button>
                <icons_material_1.ZoomOut />
              </material_1.Button>
            </material_1.Tooltip>
            <material_1.Tooltip title="Center View">
              <material_1.Button>
                <icons_material_1.CenterFocusStrong />
              </material_1.Button>
            </material_1.Tooltip>
            <material_1.Tooltip title="Refresh">
              <material_1.Button>
                <icons_material_1.Refresh />
              </material_1.Button>
            </material_1.Tooltip>
            <material_1.Tooltip title="Export">
              <material_1.Button>
                <icons_material_1.Download />
              </material_1.Button>
            </material_1.Tooltip>
          </material_1.ButtonGroup>
        </material_1.Box>
      </material_1.Paper>

      {/* Content Tabs */}
      <material_1.Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <material_1.Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <material_1.Tab icon={<icons_material_1.TrendingUp />} label="Metrics"/>
          <material_1.Tab icon={<icons_material_1.FilterAlt />} label="Filters"/>
          <material_1.Tab icon={<icons_material_1.Hub />} label="Communities"/>
          <material_1.Tab icon={<icons_material_1.Timeline />} label="Pathfinding"/>
        </material_1.Tabs>

        <material_1.Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {activeTab === 0 && <NetworkMetricsPanel />}
          {activeTab === 1 && <FilterPanel />}
          {activeTab === 2 && <ClusteringPanel />}
          {activeTab === 3 && (<material_1.Box>
              <material_1.Typography variant="h6" sx={{ mb: 2 }}>
                Path Analysis
              </material_1.Typography>
              <material_1.Alert severity="info">
                Path analysis and shortest path algorithms coming soon...
              </material_1.Alert>
            </material_1.Box>)}
        </material_1.Box>
      </material_1.Paper>
    </material_1.Box>);
};
exports.AdvancedGraphInteractions = AdvancedGraphInteractions;
exports.default = exports.AdvancedGraphInteractions;
