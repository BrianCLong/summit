/**
 * Advanced Graph Interactions Component
 * Enhanced graph analysis and manipulation tools for IntelGraph
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Stack,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  AccountTree,
  Analytics,
  AutoFixHigh,
  Timeline,
  FilterAlt,
  Visibility,
  VisibilityOff,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Share,
  Download,
  Refresh,
  ExpandMore,
  TrendingUp,
  BubbleChart,
  ScatterPlot,
  Hub,
  Memory,
  Speed
} from '@mui/icons-material';

// Types
interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  centrality: number;
  cluster?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
}

interface ClusteringResult {
  clusters: { [key: number]: GraphNode[] };
  modularity: number;
  algorithm: string;
}

interface AnalysisMetric {
  name: string;
  value: number;
  description: string;
  category: 'centrality' | 'structure' | 'connectivity';
}

interface AdvancedGraphInteractionsProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeSelect?: (nodeId: string) => void;
  onEdgeSelect?: (edgeId: string) => void;
  onLayoutChange?: (layout: string) => void;
  onAnalysisRun?: (analysis: string, params: any) => void;
  enableAdvancedFeatures?: boolean;
}

// Mock data generators
const generateAnalysisMetrics = (): AnalysisMetric[] => [
  {
    name: 'Network Density',
    value: 0.23,
    description: 'Proportion of edges to possible connections',
    category: 'structure'
  },
  {
    name: 'Clustering Coefficient',
    value: 0.67,
    description: 'Tendency of nodes to cluster together',
    category: 'structure'
  },
  {
    name: 'Average Path Length',
    value: 3.2,
    description: 'Average shortest path between all node pairs',
    category: 'connectivity'
  },
  {
    name: 'Betweenness Centrality',
    value: 0.45,
    description: 'Nodes acting as bridges between communities',
    category: 'centrality'
  },
  {
    name: 'PageRank Score',
    value: 0.78,
    description: 'Node importance based on connection quality',
    category: 'centrality'
  }
];

const generateClusteringResults = (): ClusteringResult => ({
  clusters: {
    0: [
      { id: '1', label: 'Person A', type: 'person', properties: {}, centrality: 0.8 },
      { id: '2', label: 'Company X', type: 'organization', properties: {}, centrality: 0.6 }
    ],
    1: [
      { id: '3', label: 'Location Y', type: 'location', properties: {}, centrality: 0.4 },
      { id: '4', label: 'Event Z', type: 'event', properties: {}, centrality: 0.5 }
    ]
  },
  modularity: 0.73,
  algorithm: 'Louvain'
});

export const AdvancedGraphInteractions: React.FC<AdvancedGraphInteractionsProps> = ({
  nodes = [],
  edges = [],
  onNodeSelect,
  onEdgeSelect,
  onLayoutChange,
  onAnalysisRun,
  enableAdvancedFeatures = true
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedLayout, setSelectedLayout] = useState('force-directed');
  const [analysisMetrics, setAnalysisMetrics] = useState<AnalysisMetric[]>(generateAnalysisMetrics());
  const [clusteringResults, setClusteringResults] = useState<ClusteringResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filters, setFilters] = useState({
    nodeTypes: new Set<string>(['person', 'organization', 'location']),
    edgeTypes: new Set<string>(['knows', 'works_at', 'located_at']),
    centralityThreshold: 0.3,
    showClusters: false
  });

  // Clustering analysis
  const runClustering = useCallback(async () => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate analysis
    const results = generateClusteringResults();
    setClusteringResults(results);
    setIsAnalyzing(false);
    onAnalysisRun?.('clustering', { algorithm: 'louvain' });
  }, [onAnalysisRun]);

  // Layout algorithms
  const layoutOptions = [
    { value: 'force-directed', label: 'Force Directed', icon: <Hub /> },
    { value: 'hierarchical', label: 'Hierarchical', icon: <AccountTree /> },
    { value: 'circular', label: 'Circular', icon: <BubbleChart /> },
    { value: 'grid', label: 'Grid', icon: <ScatterPlot /> }
  ];

  const handleLayoutChange = (layout: string) => {
    setSelectedLayout(layout);
    onLayoutChange?.(layout);
  };

  const handleFilterChange = (filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const NetworkMetricsPanel = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Network Analysis</Typography>
      
      <Stack spacing={2}>
        {analysisMetrics.map((metric, index) => (
          <Card key={index} variant="outlined">
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">{metric.name}</Typography>
                <Chip 
                  size="small" 
                  label={metric.category} 
                  color={
                    metric.category === 'centrality' ? 'primary' : 
                    metric.category === 'structure' ? 'secondary' : 'info'
                  }
                />
              </Box>
              
              <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                {typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value}
              </Typography>
              
              <Typography variant="caption" color="text.secondary">
                {metric.description}
              </Typography>
            </CardContent>
          </Card>
        ))}

        <Button
          variant="contained"
          onClick={runClustering}
          disabled={isAnalyzing}
          startIcon={isAnalyzing ? <Memory /> : <Analytics />}
          fullWidth
        >
          {isAnalyzing ? 'Analyzing...' : 'Run Community Detection'}
        </Button>

        {clusteringResults && (
          <Alert severity="success">
            <Typography variant="body2">
              Found {Object.keys(clusteringResults.clusters).length} communities 
              with modularity score of {clusteringResults.modularity.toFixed(3)}
            </Typography>
          </Alert>
        )}
      </Stack>
    </Box>
  );

  const FilterPanel = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Filters & View</Typography>
      
      <Stack spacing={3}>
        <FormControl>
          <InputLabel>Layout Algorithm</InputLabel>
          <Select
            value={selectedLayout}
            label="Layout Algorithm"
            onChange={(e) => handleLayoutChange(e.target.value)}
          >
            {layoutOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {option.icon}
                  {option.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Centrality Threshold: {filters.centralityThreshold}
          </Typography>
          <Slider
            value={filters.centralityThreshold}
            onChange={(_, value) => handleFilterChange('centralityThreshold', value)}
            min={0}
            max={1}
            step={0.1}
            marks={[
              { value: 0, label: '0' },
              { value: 0.5, label: '0.5' },
              { value: 1, label: '1' }
            ]}
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={filters.showClusters}
              onChange={(e) => handleFilterChange('showClusters', e.target.checked)}
            />
          }
          label="Show Communities"
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Node Types</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {['person', 'organization', 'location', 'event'].map(type => (
              <Chip
                key={type}
                label={type}
                variant={filters.nodeTypes.has(type) ? 'filled' : 'outlined'}
                onClick={() => {
                  const newTypes = new Set(filters.nodeTypes);
                  if (newTypes.has(type)) {
                    newTypes.delete(type);
                  } else {
                    newTypes.add(type);
                  }
                  handleFilterChange('nodeTypes', newTypes);
                }}
                size="small"
              />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );

  const ClusteringPanel = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Community Analysis</Typography>
      
      {isAnalyzing && <LinearProgress sx={{ mb: 2 }} />}
      
      {clusteringResults ? (
        <Stack spacing={2}>
          <Alert severity="info">
            <Typography variant="body2">
              Detected {Object.keys(clusteringResults.clusters).length} communities using {clusteringResults.algorithm} algorithm
            </Typography>
          </Alert>

          {Object.entries(clusteringResults.clusters).map(([clusterId, clusterNodes]) => (
            <Accordion key={clusterId}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Badge badgeContent={clusterNodes.length} color="primary">
                    <Hub />
                  </Badge>
                  <Typography>Community {parseInt(clusterId) + 1}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  {clusterNodes.map(node => (
                    <Box
                      key={node.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => onNodeSelect?.(node.id)}
                    >
                      <Box>
                        <Typography variant="body2">{node.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {node.type}
                        </Typography>
                      </Box>
                      <Chip 
                        size="small" 
                        label={`${(node.centrality * 100).toFixed(0)}%`}
                        variant="outlined"
                      />
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      ) : (
        <Alert severity="info">
          Run community detection analysis to identify node clusters and relationships.
        </Alert>
      )}
    </Box>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Advanced Graph Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {nodes.length} nodes, {edges.length} edges
            </Typography>
          </Box>

          <ButtonGroup variant="outlined">
            <Tooltip title="Zoom In">
              <Button><ZoomIn /></Button>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <Button><ZoomOut /></Button>
            </Tooltip>
            <Tooltip title="Center View">
              <Button><CenterFocusStrong /></Button>
            </Tooltip>
            <Tooltip title="Refresh">
              <Button><Refresh /></Button>
            </Tooltip>
            <Tooltip title="Export">
              <Button><Download /></Button>
            </Tooltip>
          </ButtonGroup>
        </Box>
      </Paper>

      {/* Content Tabs */}
      <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)} 
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<TrendingUp />} label="Metrics" />
          <Tab icon={<FilterAlt />} label="Filters" />
          <Tab icon={<Hub />} label="Communities" />
          <Tab icon={<Timeline />} label="Pathfinding" />
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {activeTab === 0 && <NetworkMetricsPanel />}
          {activeTab === 1 && <FilterPanel />}
          {activeTab === 2 && <ClusteringPanel />}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Path Analysis</Typography>
              <Alert severity="info">
                Path analysis and shortest path algorithms coming soon...
              </Alert>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default AdvancedGraphInteractions;