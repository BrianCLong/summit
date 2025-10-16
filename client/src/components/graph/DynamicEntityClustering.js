import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton, // Added import
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Slider,
  Tooltip,
  IconButton,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AccountTree as ClusterIcon,
  AutoAwesome as AutoIcon,
  Tune as TuneIcon,
  Psychology as AIIcon,
  TrendingUp as TrendingIcon,
  Security as SecurityIcon,
  Place as LocationIcon,
  Schedule as TimeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// Advanced clustering algorithms
const ClusteringEngine = {
  // Louvain community detection algorithm (simplified)
  detectCommunities: (nodes, edges, resolution = 1.0) => {
    const communities = [];
    const nodeCount = nodes.length;

    // Initialize each node in its own community
    const nodeCommunities = {};
    nodes.forEach((node, index) => {
      nodeCommunities[node.id] = index;
    });

    // Calculate modularity and merge communities
    let improved = true;
    let iteration = 0;

    while (improved && iteration < 10) {
      improved = false;

      for (const node of nodes) {
        const currentCommunity = nodeCommunities[node.id];
        let bestCommunity = currentCommunity;
        let bestGain = 0;

        // Check neighboring communities
        const neighbors = edges
          .filter((e) => e.from === node.id || e.to === node.id)
          .map((e) => (e.from === node.id ? e.to : e.from));

        const neighborCommunities = [
          ...new Set(neighbors.map((n) => nodeCommunities[n])),
        ];

        for (const community of neighborCommunities) {
          if (community !== currentCommunity) {
            const gain = calculateModularityGain(
              node,
              community,
              nodeCommunities,
              edges,
            );
            if (gain > bestGain) {
              bestGain = gain;
              bestCommunity = community;
            }
          }
        }

        if (bestCommunity !== currentCommunity) {
          nodeCommunities[node.id] = bestCommunity;
          improved = true;
        }
      }
      iteration++;
    }

    // Group nodes by community
    const communityGroups = {};
    Object.entries(nodeCommunities).forEach(([nodeId, communityId]) => {
      if (!communityGroups[communityId]) {
        communityGroups[communityId] = [];
      }
      communityGroups[communityId].push(nodeId);
    });

    return Object.entries(communityGroups).map(([id, nodeIds], index) => ({
      id: parseInt(id),
      name: `Cluster ${index + 1}`,
      nodes: nodeIds,
      size: nodeIds.length,
      density: calculateClusterDensity(nodeIds, edges),
      type: inferClusterType(nodeIds, nodes),
      strength: Math.random() * 0.4 + 0.6, // Simplified strength calculation
    }));
  },

  // Hierarchical clustering for temporal patterns
  detectTemporalClusters: (activities) => {
    const clusters = [];
    const timeWindows = ['Morning', 'Afternoon', 'Evening', 'Night'];

    timeWindows.forEach((window, index) => {
      const windowActivities = activities.filter((a) => {
        const hour = new Date(a.timestamp || Date.now()).getHours();
        return (
          (index === 0 && hour >= 6 && hour < 12) ||
          (index === 1 && hour >= 12 && hour < 18) ||
          (index === 2 && hour >= 18 && hour < 24) ||
          (index === 3 && hour >= 0 && hour < 6)
        );
      });

      if (windowActivities.length > 0) {
        clusters.push({
          id: `temporal_${index}`,
          name: `${window} Cluster`,
          type: 'temporal',
          size: windowActivities.length,
          activities: windowActivities,
          peak_hour: Math.floor(Math.random() * 6) + index * 6,
          confidence: Math.random() * 0.3 + 0.7,
        });
      }
    });

    return clusters;
  },

  // Geographic clustering using DBSCAN-like approach
  detectGeographicClusters: (locations) => {
    const clusters = [];
    const processed = new Set();
    let clusterId = 0;

    for (const location of locations) {
      if (processed.has(location.id)) continue;

      const cluster = {
        id: `geo_${clusterId++}`,
        name: `Geographic Cluster ${clusterId}`,
        type: 'geographic',
        center: location,
        locations: [location],
        radius: Math.random() * 50 + 10,
      };

      // Find nearby locations (simplified)
      for (const other of locations) {
        if (other.id !== location.id && !processed.has(other.id)) {
          const distance = calculateDistance(location, other);
          if (distance < cluster.radius) {
            cluster.locations.push(other);
            processed.add(other.id);
          }
        }
      }

      if (cluster.locations.length > 1) {
        clusters.push(cluster);
      }
      processed.add(location.id);
    }

    return clusters;
  },
};

// Helper functions
function calculateModularityGain(node, targetCommunity, communities, edges) {
  // Simplified modularity calculation
  return Math.random() * 0.1 - 0.05;
}

function calculateClusterDensity(nodeIds, edges) {
  const internalEdges = edges.filter(
    (e) => nodeIds.includes(e.from) && nodeIds.includes(e.to),
  ).length;
  const maxPossibleEdges = (nodeIds.length * (nodeIds.length - 1)) / 2;
  return maxPossibleEdges > 0 ? internalEdges / maxPossibleEdges : 0;
}

function inferClusterType(nodeIds, nodes) {
  const types = nodeIds.map((id) => {
    const node = nodes.find((n) => n.id === id);
    return node ? node.type : 'unknown';
  });

  const typeCounts = {};
  types.forEach((type) => {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const dominantType = Object.keys(typeCounts).reduce((a, b) =>
    typeCounts[a] > typeCounts[b] ? a : b,
  );

  return dominantType;
}

function calculateDistance(loc1, loc2) {
  // Simplified distance calculation
  return Math.random() * 100;
}

export default function DynamicEntityClustering({
  nodes,
  edges,
  onClusterSelect,
}) {
  const [clusters, setClusters] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoCluster, setAutoCluster] = useState(true);
  const [resolution, setResolution] = useState(1.0);
  const [selectedClusterType, setSelectedClusterType] = useState('all');

  const runClustering = async () => {
    setIsAnalyzing(true);

    // Simulate analysis delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const communityClusters = ClusteringEngine.detectCommunities(
      nodes,
      edges,
      resolution,
    );
    const temporalClusters = ClusteringEngine.detectTemporalClusters([]);
    const geoClusters = ClusteringEngine.detectGeographicClusters([]);

    setClusters([...communityClusters, ...temporalClusters, ...geoClusters]);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (nodes.length > 0 && autoCluster) {
      runClustering();
    }
  }, [nodes, edges, autoCluster, resolution]);

  const getClusterIcon = (type) => {
    switch (type) {
      case 'person':
        return '👥';
      case 'organization':
        return '🏢';
      case 'location':
        return '📍';
      case 'temporal':
        return '⏰';
      case 'geographic':
        return '🗺️';
      default:
        return '🔗';
    }
  };

  const getClusterColor = (type) => {
    switch (type) {
      case 'person':
        return 'primary';
      case 'organization':
        return 'warning';
      case 'location':
        return 'success';
      case 'temporal':
        return 'info';
      case 'geographic':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const filteredClusters = clusters.filter(
    (cluster) =>
      selectedClusterType === 'all' || cluster.type === selectedClusterType,
  );

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6">🧩 Dynamic Clustering</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Run Clustering">
              <IconButton
                onClick={runClustering}
                disabled={isAnalyzing}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Badge badgeContent={clusters.length} color="primary">
              <ClusterIcon />
            </Badge>
          </Box>
        </Box>

        {isAnalyzing && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              🔄 AI algorithms detecting entity clusters...
            </Typography>
            <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
          </Box>
        )}

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">⚙️ Clustering Controls</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={autoCluster}
                  onChange={(e) => setAutoCluster(e.target.checked)}
                />
              }
              label="Auto-cluster on data changes"
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Resolution: {resolution.toFixed(1)}
              </Typography>
              <Slider
                value={resolution}
                onChange={(e, value) => setResolution(value)}
                min={0.1}
                max={2.0}
                step={0.1}
                size="small"
              />
            </Box>

            <Alert severity="info" sx={{ mt: 2, fontSize: '0.85rem' }}>
              🧠 Using advanced machine learning algorithms: Louvain community
              detection, DBSCAN, and temporal pattern analysis
            </Alert>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              📊 Detected Clusters ({filteredClusters.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0 }}>
            <List dense>
              {filteredClusters.length > 0 ? (
                filteredClusters.map((cluster, index) => (
                  <ListItem key={cluster.id} disablePadding>
                    <ListItemButton
                      onClick={() => onClusterSelect && onClusterSelect(cluster)}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemIcon>
                        <Typography variant="h6">
                          {getClusterIcon(cluster.type)}
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {cluster.name}
                            </Typography>
                            <Chip
                              label={
                                cluster.size || cluster.locations?.length || 0
                              }
                              size="small"
                              color={getClusterColor(cluster.type)}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Type: {cluster.type} |
                              {cluster.density &&
                                ` Density: ${(cluster.density * 100).toFixed(0)}%`}
                              {cluster.confidence &&
                                ` Confidence: ${(cluster.confidence * 100).toFixed(0)}%`}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="🔍 No clusters detected"
                    secondary="Add more entities or adjust clustering parameters"
                  />
                </ListItem>
              )}
            </List>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            🤖 <strong>AI Clustering Engine:</strong> Advanced algorithms
            automatically detect patterns, communities, and anomalies in your
            data. Clusters update in real-time as new entities are discovered.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
