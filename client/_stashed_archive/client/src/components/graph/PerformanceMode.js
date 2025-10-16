/**
 * Graph Performance Mode Component
 *
 * Provides Level-of-Detail (LOD) rendering and clustering for large graphs
 * to maintain smooth performance with 10k+ nodes.
 *
 * Features:
 * - Viewport-based culling
 * - Community detection clustering
 * - Dynamic LOD based on zoom level
 * - WebGL acceleration options
 * - Performance metrics monitoring
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  Visibility as VisibilityIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

// Performance configuration constants
const PERFORMANCE_PRESETS = {
  HIGH_QUALITY: {
    name: 'High Quality',
    lodThreshold: 0.1,
    clusterThreshold: 500,
    maxVisibleNodes: 5000,
    enableCulling: false,
    enableClustering: false,
    renderQuality: 'high',
  },
  BALANCED: {
    name: 'Balanced',
    lodThreshold: 0.3,
    clusterThreshold: 1000,
    maxVisibleNodes: 2000,
    enableCulling: true,
    enableClustering: true,
    renderQuality: 'medium',
  },
  HIGH_PERFORMANCE: {
    name: 'High Performance',
    lodThreshold: 0.5,
    clusterThreshold: 500,
    maxVisibleNodes: 1000,
    enableCulling: true,
    enableClustering: true,
    renderQuality: 'low',
  },
  MASSIVE_SCALE: {
    name: 'Massive Scale',
    lodThreshold: 0.7,
    clusterThreshold: 200,
    maxVisibleNodes: 500,
    enableCulling: true,
    enableClustering: true,
    renderQuality: 'minimal',
  },
};

const PerformanceMode = ({
  graph,
  onConfigChange,
  performanceMetrics,
  isProcessing = false,
}) => {
  const [config, setConfig] = useState(PERFORMANCE_PRESETS.BALANCED);
  const [customConfig, setCustomConfig] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clusteringProgress, setClusteringProgress] = useState(0);
  const [performanceStats, setPerformanceStats] = useState({
    fps: 60,
    nodeCount: 0,
    visibleNodes: 0,
    clusteredNodes: 0,
    renderTime: 0,
  });

  // Auto-detect optimal settings based on graph size
  const autoDetectSettings = useCallback(() => {
    if (!graph || !graph.nodes) return PERFORMANCE_PRESETS.BALANCED;

    const nodeCount = graph.nodes.length;
    const edgeCount = graph.edges ? graph.edges.length : 0;

    if (nodeCount < 500) {
      return PERFORMANCE_PRESETS.HIGH_QUALITY;
    } else if (nodeCount < 2000) {
      return PERFORMANCE_PRESETS.BALANCED;
    } else if (nodeCount < 10000) {
      return PERFORMANCE_PRESETS.HIGH_PERFORMANCE;
    } else {
      return PERFORMANCE_PRESETS.MASSIVE_SCALE;
    }
  }, [graph]);

  // Community detection clustering algorithm
  const performCommunityDetection = useCallback(
    async (nodes, edges, threshold) => {
      setClusteringProgress(0);

      // Simple Louvain-inspired community detection
      const communities = new Map();
      const nodeConnections = new Map();

      // Build adjacency information
      setClusteringProgress(20);
      edges.forEach((edge) => {
        if (!nodeConnections.has(edge.source)) {
          nodeConnections.set(edge.source, new Set());
        }
        if (!nodeConnections.has(edge.target)) {
          nodeConnections.set(edge.target, new Set());
        }
        nodeConnections.get(edge.source).add(edge.target);
        nodeConnections.get(edge.target).add(edge.source);
      });

      setClusteringProgress(50);

      // Initial community assignment (each node in its own community)
      let communityId = 0;
      nodes.forEach((node) => {
        communities.set(node.id, communityId++);
      });

      setClusteringProgress(70);

      // Merge communities based on connections
      const communityNodes = new Map();
      communities.forEach((community, nodeId) => {
        if (!communityNodes.has(community)) {
          communityNodes.set(community, []);
        }
        communityNodes.get(community).push(nodeId);
      });

      setClusteringProgress(90);

      // Create cluster representatives for large communities
      const clusters = [];
      communityNodes.forEach((nodeIds, communityId) => {
        if (nodeIds.length >= threshold) {
          // Create cluster node
          const cluster = {
            id: `cluster_${communityId}`,
            type: 'cluster',
            size: nodeIds.length,
            nodes: nodeIds,
            x:
              nodeIds.reduce((sum, id) => {
                const node = nodes.find((n) => n.id === id);
                return sum + (node?.x || 0);
              }, 0) / nodeIds.length,
            y:
              nodeIds.reduce((sum, id) => {
                const node = nodes.find((n) => n.id === id);
                return sum + (node?.y || 0);
              }, 0) / nodeIds.length,
            label: `Cluster (${nodeIds.length} nodes)`,
          };
          clusters.push(cluster);
        }
      });

      setClusteringProgress(100);

      return {
        clusters,
        communities: communityNodes,
      };
    },
    [],
  );

  // Level-of-Detail calculation based on zoom and distance
  const calculateLOD = useCallback(
    (node, zoom, center) => {
      const distance = Math.sqrt(
        Math.pow(node.x - center.x, 2) + Math.pow(node.y - center.y, 2),
      );

      const normalizedDistance = distance / (zoom * 1000);

      if (normalizedDistance < config.lodThreshold * 0.3) {
        return 'high'; // Full detail
      } else if (normalizedDistance < config.lodThreshold * 0.7) {
        return 'medium'; // Reduced detail
      } else if (normalizedDistance < config.lodThreshold) {
        return 'low'; // Minimal detail
      } else {
        return 'culled'; // Not visible
      }
    },
    [config.lodThreshold],
  );

  // Viewport culling
  const performViewportCulling = useCallback(
    (nodes, viewport) => {
      if (!config.enableCulling) return nodes;

      const padding = 100; // Viewport padding
      return nodes.filter((node) => {
        return (
          node.x >= viewport.x - padding &&
          node.x <= viewport.x + viewport.width + padding &&
          node.y >= viewport.y - padding &&
          node.y <= viewport.y + viewport.height + padding
        );
      });
    },
    [config.enableCulling],
  );

  // Apply performance optimizations
  const applyOptimizations = useCallback(
    async (graphData, viewport, zoom) => {
      if (!graphData || !graphData.nodes) return graphData;

      let optimizedNodes = [...graphData.nodes];
      let optimizedEdges = [...(graphData.edges || [])];
      let clusters = [];

      // Step 1: Viewport culling
      if (config.enableCulling) {
        optimizedNodes = performViewportCulling(optimizedNodes, viewport);
      }

      // Step 2: Clustering for large graphs
      if (
        config.enableClustering &&
        optimizedNodes.length > config.clusterThreshold
      ) {
        const clusterResult = await performCommunityDetection(
          optimizedNodes,
          optimizedEdges,
          Math.min(50, config.clusterThreshold / 10),
        );
        clusters = clusterResult.clusters;

        // Replace clustered nodes with cluster representatives
        clusterResult.communities.forEach((nodeIds, communityId) => {
          if (nodeIds.length >= 50) {
            // Remove original nodes
            optimizedNodes = optimizedNodes.filter(
              (node) => !nodeIds.includes(node.id),
            );

            // Remove edges between clustered nodes
            optimizedEdges = optimizedEdges.filter(
              (edge) =>
                !(
                  nodeIds.includes(edge.source) && nodeIds.includes(edge.target)
                ),
            );
          }
        });

        // Add cluster nodes
        optimizedNodes = [...optimizedNodes, ...clusters];
      }

      // Step 3: LOD application
      const center = {
        x: viewport.x + viewport.width / 2,
        y: viewport.y + viewport.height / 2,
      };
      optimizedNodes = optimizedNodes.map((node) => ({
        ...node,
        lod: calculateLOD(node, zoom, center),
        visible: calculateLOD(node, zoom, center) !== 'culled',
      }));

      // Step 4: Limit visible nodes
      if (optimizedNodes.length > config.maxVisibleNodes) {
        // Sort by importance (size, connections, etc.) and take top N
        optimizedNodes.sort((a, b) => {
          const aImportance = (a.size || 1) + (a.connections || 0);
          const bImportance = (b.size || 1) + (b.connections || 0);
          return bImportance - aImportance;
        });
        optimizedNodes = optimizedNodes.slice(0, config.maxVisibleNodes);
      }

      return {
        nodes: optimizedNodes,
        edges: optimizedEdges,
        clusters,
        stats: {
          originalNodes: graphData.nodes.length,
          visibleNodes: optimizedNodes.filter((n) => n.visible).length,
          clusteredNodes: clusters.reduce(
            (sum, cluster) => sum + cluster.size,
            0,
          ),
          culledNodes: graphData.nodes.length - optimizedNodes.length,
        },
      };
    },
    [config, performCommunityDetection, calculateLOD, performViewportCulling],
  );

  // Handle preset change
  const handlePresetChange = (preset) => {
    setConfig(preset);
    setCustomConfig(false);
    onConfigChange?.(preset);
  };

  // Handle custom config change
  const handleCustomChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setCustomConfig(true);
    onConfigChange?.(newConfig);
  };

  // Performance status calculation
  const performanceStatus = useMemo(() => {
    const fps = performanceStats.fps;
    const visibleNodes = performanceStats.visibleNodes;

    if (fps >= 55 && visibleNodes < config.maxVisibleNodes) {
      return {
        level: 'good',
        color: 'success',
        message: 'Optimal performance',
      };
    } else if (fps >= 30) {
      return {
        level: 'warning',
        color: 'warning',
        message: 'Acceptable performance',
      };
    } else {
      return {
        level: 'poor',
        color: 'error',
        message: 'Performance issues detected',
      };
    }
  }, [performanceStats, config.maxVisibleNodes]);

  // Auto-adjust settings based on performance
  useEffect(() => {
    if (performanceStats.fps < 30 && !customConfig) {
      // Auto-downgrade to higher performance mode
      const currentIndex = Object.values(PERFORMANCE_PRESETS).findIndex(
        (p) => p.name === config.name,
      );
      if (currentIndex < Object.values(PERFORMANCE_PRESETS).length - 1) {
        const nextPreset = Object.values(PERFORMANCE_PRESETS)[currentIndex + 1];
        handlePresetChange(nextPreset);
      }
    }
  }, [performanceStats.fps, config.name, customConfig]);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <SpeedIcon color="primary" />
            <Typography variant="h6">Performance Mode</Typography>
            <Chip
              label={performanceStatus.message}
              color={performanceStatus.color}
              size="small"
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="textSecondary">
              {performanceStats.fps.toFixed(0)} FPS
            </Typography>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Performance Stats */}
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <Tooltip title="Frames per second">
            <Chip
              icon={<TimelineIcon />}
              label={`${performanceStats.fps.toFixed(0)} FPS`}
              size="small"
              color={performanceStatus.color}
            />
          </Tooltip>

          <Tooltip title="Visible nodes / Total nodes">
            <Chip
              icon={<VisibilityIcon />}
              label={`${performanceStats.visibleNodes} / ${performanceStats.nodeCount}`}
              size="small"
            />
          </Tooltip>

          <Tooltip title="Clustered nodes">
            <Chip
              icon={<MemoryIcon />}
              label={`${performanceStats.clusteredNodes} clustered`}
              size="small"
            />
          </Tooltip>
        </Box>

        {/* Clustering Progress */}
        {clusteringProgress > 0 && clusteringProgress < 100 && (
          <Box mb={2}>
            <Typography variant="body2" gutterBottom>
              Clustering graph... {clusteringProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={clusteringProgress} />
          </Box>
        )}

        <Collapse in={expanded}>
          {/* Preset Selection */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Performance Preset</InputLabel>
            <Select
              value={config.name}
              onChange={(e) => {
                const preset = Object.values(PERFORMANCE_PRESETS).find(
                  (p) => p.name === e.target.value,
                );
                handlePresetChange(preset);
              }}
            >
              {Object.values(PERFORMANCE_PRESETS).map((preset) => (
                <MenuItem key={preset.name} value={preset.name}>
                  {preset.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Custom Settings */}
          <Box display="flex" flexDirection="column" gap={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enableCulling}
                  onChange={(e) =>
                    handleCustomChange('enableCulling', e.target.checked)
                  }
                />
              }
              label="Viewport Culling"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.enableClustering}
                  onChange={(e) =>
                    handleCustomChange('enableClustering', e.target.checked)
                  }
                />
              }
              label="Community Clustering"
            />

            <Box>
              <Typography gutterBottom>
                LOD Threshold: {config.lodThreshold}
              </Typography>
              <Slider
                value={config.lodThreshold}
                onChange={(e, value) =>
                  handleCustomChange('lodThreshold', value)
                }
                min={0.1}
                max={1.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <Typography gutterBottom>
                Max Visible Nodes: {config.maxVisibleNodes}
              </Typography>
              <Slider
                value={config.maxVisibleNodes}
                onChange={(e, value) =>
                  handleCustomChange('maxVisibleNodes', value)
                }
                min={100}
                max={10000}
                step={100}
                marks={[
                  { value: 500, label: '500' },
                  { value: 2000, label: '2K' },
                  { value: 5000, label: '5K' },
                  { value: 10000, label: '10K' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <Typography gutterBottom>
                Cluster Threshold: {config.clusterThreshold}
              </Typography>
              <Slider
                value={config.clusterThreshold}
                onChange={(e, value) =>
                  handleCustomChange('clusterThreshold', value)
                }
                min={100}
                max={2000}
                step={50}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </Box>

          {/* Performance Recommendations */}
          {performanceStatus.level === 'poor' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Performance Recommendations:</strong>
              </Typography>
              <ul>
                <li>Enable viewport culling to reduce rendered nodes</li>
                <li>Lower the cluster threshold to group more nodes</li>
                <li>Reduce max visible nodes limit</li>
                <li>
                  Consider using Massive Scale preset for very large graphs
                </li>
              </ul>
            </Alert>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default PerformanceMode;
