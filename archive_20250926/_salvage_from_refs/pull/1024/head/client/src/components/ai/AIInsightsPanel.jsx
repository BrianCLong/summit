import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  AlertTitle,
  Skeleton,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Avatar,
  AvatarGroup
} from '@mui/material';
import {
  Psychology,
  TrendingUp,
  Warning,
  Lightbulb,
  Timeline,
  AccountTree,
  Analytics,
  Search,
  Star,
  StarBorder,
  Visibility,
  VisibilityOff,
  ExpandMore,
  AutoAwesome,
  BugReport,
  Link,
  Group,
  LocationOn,
  Schedule,
  TrendingDown,
  Security,
  Flag,
  Refresh,
  SaveAlt
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

function AIInsightsPanel({ cy, selectedNode, investigationId, onRecommendationClick, onAnomalyClick }) {
  const [activeTab, setActiveTab] = useState(0);
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (cy) {
      generateInsights();
      if (autoRefresh) {
        intervalRef.current = setInterval(generateInsights, 30000); // Refresh every 30 seconds
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cy, selectedNode, autoRefresh]);

  const generateInsights = async () => {
    if (!cy) return;
    
    setLoading(true);
    
    try {
      // Simulate AI analysis delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const graphData = {
        nodes: cy.nodes().map(n => n.data()),
        edges: cy.edges().map(e => e.data())
      };

      // Generate insights
      const newInsights = await analyzeGraphStructure(graphData);
      const newRecommendations = await generateRecommendations(graphData, selectedNode);
      const newAnomalies = await detectAnomalies(graphData);
      const newPredictions = await generatePredictions(graphData);

      setInsights(newInsights);
      setRecommendations(newRecommendations);
      setAnomalies(newAnomalies);
      setPredictions(newPredictions);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeGraphStructure = async (graphData) => {
    const insights = [];
    const nodeCount = graphData.nodes.length;
    const edgeCount = graphData.edges.length;
    const density = edgeCount / (nodeCount * (nodeCount - 1) / 2);

    // Network density insight
    if (density > 0.7) {
      insights.push({
        id: 'density-high',
        type: 'network',
        severity: 'warning',
        title: 'High Network Density',
        description: `Network density is ${(density * 100).toFixed(1)}%, indicating many interconnections. Consider clustering analysis.`,
        confidence: 0.9,
        actionable: true,
        action: 'cluster_analysis',
        timestamp: new Date()
      });
    } else if (density < 0.1) {
      insights.push({
        id: 'density-low',
        type: 'network',
        severity: 'info',
        title: 'Sparse Network',
        description: `Low network density (${(density * 100).toFixed(1)}%) suggests fragmented connections. Look for bridges.`,
        confidence: 0.8,
        actionable: true,
        action: 'bridge_analysis',
        timestamp: new Date()
      });
    }

    // Node degree analysis
    const degrees = graphData.nodes.map(n => {
      return graphData.edges.filter(e => e.source === n.id || e.target === n.id).length;
    });
    const avgDegree = degrees.reduce((a, b) => a + b, 0) / degrees.length;
    const maxDegree = Math.max(...degrees);
    const hubNodes = graphData.nodes.filter((n, i) => degrees[i] > avgDegree * 2);

    if (hubNodes.length > 0) {
      insights.push({
        id: 'hub-nodes',
        type: 'structural',
        severity: 'high',
        title: 'Hub Nodes Detected',
        description: `${hubNodes.length} nodes with significantly high connectivity detected. These may be critical entities.`,
        confidence: 0.95,
        actionable: true,
        action: 'highlight_hubs',
        data: hubNodes,
        timestamp: new Date()
      });
    }

    // Isolated nodes
    const isolatedNodes = graphData.nodes.filter((n, i) => degrees[i] === 0);
    if (isolatedNodes.length > 0) {
      insights.push({
        id: 'isolated-nodes',
        type: 'structural',
        severity: 'info',
        title: 'Isolated Entities',
        description: `${isolatedNodes.length} entities have no connections. Review their relevance.`,
        confidence: 0.7,
        actionable: true,
        action: 'review_isolated',
        data: isolatedNodes,
        timestamp: new Date()
      });
    }

    // Entity type distribution
    const typeDistribution = {};
    graphData.nodes.forEach(n => {
      typeDistribution[n.type] = (typeDistribution[n.type] || 0) + 1;
    });

    const dominantType = Object.entries(typeDistribution).reduce((a, b) => 
      typeDistribution[a[0]] > typeDistribution[b[0]] ? a : b
    );

    if (dominantType[1] > nodeCount * 0.6) {
      insights.push({
        id: 'type-dominance',
        type: 'content',
        severity: 'info',
        title: 'Entity Type Dominance',
        description: `${dominantType[0]} entities make up ${((dominantType[1] / nodeCount) * 100).toFixed(1)}% of the network.`,
        confidence: 0.8,
        actionable: false,
        timestamp: new Date()
      });
    }

    return insights;
  };

  const generateRecommendations = async (graphData, selectedNode) => {
    const recommendations = [];

    if (selectedNode) {
      // Recommendations based on selected node
      const nodeData = selectedNode;
      const connectedNodes = graphData.edges
        .filter(e => e.source === nodeData.id || e.target === nodeData.id)
        .map(e => e.source === nodeData.id ? e.target : e.source);

      // Suggest similar entities
      const similarNodes = graphData.nodes.filter(n => 
        n.type === nodeData.type && 
        n.id !== nodeData.id &&
        !connectedNodes.includes(n.id)
      );

      if (similarNodes.length > 0) {
        recommendations.push({
          id: 'similar-entities',
          type: 'connection',
          title: 'Explore Similar Entities',
          description: `Found ${similarNodes.length} similar ${nodeData.type} entities that might be related.`,
          confidence: 0.7,
          suggestions: similarNodes.slice(0, 5),
          action: 'explore_similar',
          timestamp: new Date()
        });
      }

      // Suggest potential connections
      const secondDegreeNodes = new Set();
      connectedNodes.forEach(nodeId => {
        graphData.edges
          .filter(e => (e.source === nodeId || e.target === nodeId) && 
                      e.source !== selectedNode.id && e.target !== selectedNode.id)
          .forEach(e => {
            const candidate = e.source === nodeId ? e.target : e.source;
            if (!connectedNodes.includes(candidate)) {
              secondDegreeNodes.add(candidate);
            }
          });
      });

      if (secondDegreeNodes.size > 0) {
        const candidates = Array.from(secondDegreeNodes)
          .map(id => graphData.nodes.find(n => n.id === id))
          .filter(Boolean)
          .slice(0, 3);

        recommendations.push({
          id: 'potential-connections',
          type: 'relationship',
          title: 'Potential Connections',
          description: 'These entities are connected to your selection through intermediaries.',
          confidence: 0.6,
          suggestions: candidates,
          action: 'investigate_connection',
          timestamp: new Date()
        });
      }
    }

    // General recommendations
    const nodesByImportance = graphData.nodes
      .filter(n => n.importance)
      .sort((a, b) => (b.importance || 0) - (a.importance || 0))
      .slice(0, 5);

    if (nodesByImportance.length > 0) {
      recommendations.push({
        id: 'high-importance',
        type: 'priority',
        title: 'High-Priority Entities',
        description: 'These entities have been marked as high importance for investigation.',
        confidence: 0.9,
        suggestions: nodesByImportance,
        action: 'prioritize_investigation',
        timestamp: new Date()
      });
    }

    // Relationship pattern analysis
    const relationshipTypes = {};
    graphData.edges.forEach(e => {
      relationshipTypes[e.type] = (relationshipTypes[e.type] || 0) + 1;
    });

    const unusualRelationships = Object.entries(relationshipTypes)
      .filter(([type, count]) => count === 1)
      .map(([type]) => type);

    if (unusualRelationships.length > 0) {
      recommendations.push({
        id: 'unusual-relationships',
        type: 'pattern',
        title: 'Unusual Relationship Types',
        description: `Found ${unusualRelationships.length} unique relationship types that might warrant investigation.`,
        confidence: 0.6,
        suggestions: unusualRelationships.map(type => ({ type, label: type })),
        action: 'analyze_relationships',
        timestamp: new Date()
      });
    }

    return recommendations;
  };

  const detectAnomalies = async (graphData) => {
    const anomalies = [];

    // Calculate degree centrality statistics
    const degrees = graphData.nodes.map(n => {
      return graphData.edges.filter(e => e.source === n.id || e.target === n.id).length;
    });
    
    const avgDegree = degrees.reduce((a, b) => a + b, 0) / degrees.length;
    const stdDev = Math.sqrt(
      degrees.reduce((sum, degree) => sum + Math.pow(degree - avgDegree, 2), 0) / degrees.length
    );

    // Detect high-degree anomalies
    const highDegreeThreshold = avgDegree + 2 * stdDev;
    const highDegreeNodes = graphData.nodes.filter((n, i) => degrees[i] > highDegreeThreshold);

    highDegreeNodes.forEach(node => {
      anomalies.push({
        id: `high-degree-${node.id}`,
        type: 'structural',
        severity: 'medium',
        title: 'Unusually High Connectivity',
        description: `Entity "${node.label}" has ${degrees[graphData.nodes.indexOf(node)]} connections, which is ${((degrees[graphData.nodes.indexOf(node)] - avgDegree) / stdDev).toFixed(1)} standard deviations above average.`,
        entity: node,
        confidence: 0.8,
        riskLevel: 'medium',
        timestamp: new Date()
      });
    });

    // Detect temporal anomalies
    const nodesWithTime = graphData.nodes.filter(n => 
      n.properties && (n.properties.date || n.properties.timestamp || n.properties.created_at)
    );

    if (nodesWithTime.length > 5) {
      const timestamps = nodesWithTime.map(n => {
        const timeStr = n.properties.date || n.properties.timestamp || n.properties.created_at;
        return new Date(timeStr).getTime();
      }).filter(t => !isNaN(t));

      if (timestamps.length > 0) {
        timestamps.sort((a, b) => a - b);
        const timeGaps = [];
        for (let i = 1; i < timestamps.length; i++) {
          timeGaps.push(timestamps[i] - timestamps[i - 1]);
        }

        const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
        const largeGaps = timeGaps.filter(gap => gap > avgGap * 3);

        if (largeGaps.length > 0) {
          anomalies.push({
            id: 'temporal-gaps',
            type: 'temporal',
            severity: 'low',
            title: 'Temporal Activity Gaps',
            description: `Detected ${largeGaps.length} significant gaps in temporal activity that might indicate missing data or suspicious periods.`,
            confidence: 0.6,
            riskLevel: 'low',
            timestamp: new Date()
          });
        }
      }
    }

    // Detect relationship weight anomalies
    const weights = graphData.edges.map(e => e.weight || 0.5).filter(w => w > 0);
    if (weights.length > 0) {
      const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
      const weightStdDev = Math.sqrt(
        weights.reduce((sum, weight) => sum + Math.pow(weight - avgWeight, 2), 0) / weights.length
      );

      const anomalousEdges = graphData.edges.filter(e => {
        const weight = e.weight || 0.5;
        return Math.abs(weight - avgWeight) > 2 * weightStdDev;
      });

      anomalousEdges.forEach(edge => {
        const sourceNode = graphData.nodes.find(n => n.id === edge.source);
        const targetNode = graphData.nodes.find(n => n.id === edge.target);
        
        anomalies.push({
          id: `weight-anomaly-${edge.id}`,
          type: 'relationship',
          severity: 'low',
          title: 'Unusual Relationship Strength',
          description: `Relationship between "${sourceNode?.label}" and "${targetNode?.label}" has unusual strength (${edge.weight}).`,
          entity: { source: sourceNode, target: targetNode, edge },
          confidence: 0.5,
          riskLevel: 'low',
          timestamp: new Date()
        });
      });
    }

    // Geographic anomalies
    const nodesWithCoords = graphData.nodes.filter(n => 
      n.properties && n.properties.latitude && n.properties.longitude
    );

    if (nodesWithCoords.length > 3) {
      // Simple geographic clustering to find outliers
      const coords = nodesWithCoords.map(n => ({
        lat: parseFloat(n.properties.latitude),
        lng: parseFloat(n.properties.longitude),
        node: n
      }));

      const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
      const avgLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;

      const distances = coords.map(c => {
        const latDiff = c.lat - avgLat;
        const lngDiff = c.lng - avgLng;
        return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      });

      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      const distanceThreshold = avgDistance * 3;

      coords.forEach((coord, index) => {
        if (distances[index] > distanceThreshold) {
          anomalies.push({
            id: `geo-outlier-${coord.node.id}`,
            type: 'geographic',
            severity: 'low',
            title: 'Geographic Outlier',
            description: `Entity "${coord.node.label}" is geographically isolated from other entities in the network.`,
            entity: coord.node,
            confidence: 0.6,
            riskLevel: 'low',
            timestamp: new Date()
          });
        }
      });
    }

    return anomalies;
  };

  const generatePredictions = async (graphData) => {
    const predictions = [];

    // Predict likely future connections based on common neighbors
    const commonNeighbors = {};
    
    graphData.nodes.forEach(node1 => {
      graphData.nodes.forEach(node2 => {
        if (node1.id >= node2.id) return;
        
        const neighbors1 = new Set();
        const neighbors2 = new Set();
        
        graphData.edges.forEach(edge => {
          if (edge.source === node1.id) neighbors1.add(edge.target);
          if (edge.target === node1.id) neighbors1.add(edge.source);
          if (edge.source === node2.id) neighbors2.add(edge.target);
          if (edge.target === node2.id) neighbors2.add(edge.source);
        });

        const common = new Set([...neighbors1].filter(x => neighbors2.has(x)));
        
        if (common.size >= 2) {
          const score = common.size / Math.max(neighbors1.size, neighbors2.size);
          commonNeighbors[`${node1.id}-${node2.id}`] = {
            node1,
            node2,
            commonCount: common.size,
            score
          };
        }
      });
    });

    const likelyConnections = Object.values(commonNeighbors)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (likelyConnections.length > 0) {
      predictions.push({
        id: 'likely-connections',
        type: 'connection',
        title: 'Predicted Future Connections',
        description: 'Based on common neighbor analysis, these entities are likely to be connected.',
        confidence: 0.7,
        predictions: likelyConnections.map(lc => ({
          source: lc.node1,
          target: lc.node2,
          confidence: lc.score,
          reason: `${lc.commonCount} common neighbors`
        })),
        timestamp: new Date()
      });
    }

    // Predict entity importance evolution
    const importanceGrowth = graphData.nodes
      .filter(n => n.importance)
      .map(node => {
        const degree = graphData.edges.filter(e => e.source === node.id || e.target === node.id).length;
        const growthPotential = (degree * 0.3) + ((node.importance || 1) * 0.7);
        
        return {
          node,
          currentImportance: node.importance,
          predictedImportance: Math.min(5, growthPotential),
          growthPotential: growthPotential - (node.importance || 1)
        };
      })
      .filter(p => p.growthPotential > 0.5)
      .sort((a, b) => b.growthPotential - a.growthPotential)
      .slice(0, 3);

    if (importanceGrowth.length > 0) {
      predictions.push({
        id: 'importance-growth',
        type: 'importance',
        title: 'Rising Importance Entities',
        description: 'These entities are predicted to gain importance in the network.',
        confidence: 0.6,
        predictions: importanceGrowth,
        timestamp: new Date()
      });
    }

    return predictions;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRecommendationAction = (recommendation) => {
    if (onRecommendationClick) {
      onRecommendationClick(recommendation);
    }

    // Highlight relevant nodes in the graph
    if (cy && recommendation.suggestions) {
      cy.elements().removeClass('highlighted');
      recommendation.suggestions.forEach(suggestion => {
        const element = cy.getElementById(suggestion.id || suggestion.node?.id);
        if (element.length > 0) {
          element.addClass('highlighted');
        }
      });
    }
  };

  const handleAnomalyAction = (anomaly) => {
    if (onAnomalyClick) {
      onAnomalyClick(anomaly);
    }

    // Highlight anomalous elements
    if (cy && anomaly.entity) {
      cy.elements().removeClass('highlighted');
      if (anomaly.entity.id) {
        const element = cy.getElementById(anomaly.entity.id);
        if (element.length > 0) {
          element.addClass('highlighted');
        }
      }
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <Flag color="error" />;
      case 'medium': return <Warning color="warning" />;
      case 'low': return <Lightbulb color="info" />;
      default: return <Lightbulb />;
    }
  };

  const renderInsights = () => (
    <List>
      {insights.map((insight) => (
        <ListItem key={insight.id} alignItems="flex-start">
          <ListItemIcon>
            {getSeverityIcon(insight.severity)}
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2">{insight.title}</Typography>
                <Chip 
                  label={`${(insight.confidence * 100).toFixed(0)}%`} 
                  size="small" 
                  color={getSeverityColor(insight.severity)}
                  variant="outlined"
                />
              </Box>
            }
            secondary={
              <>
                <Typography variant="body2" color="text.secondary">
                  {insight.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDistanceToNow(insight.timestamp, { addSuffix: true })}
                </Typography>
              </>
            }
          />
          {insight.actionable && (
            <ListItemSecondaryAction>
              <IconButton size="small">
                <Visibility />
              </IconButton>
            </ListItemSecondaryAction>
          )}
        </ListItem>
      ))}
    </List>
  );

  const renderRecommendations = () => (
    <List>
      {recommendations.map((recommendation) => (
        <Card key={recommendation.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AutoAwesome color="primary" />
              <Typography variant="h6">{recommendation.title}</Typography>
              <Chip 
                label={`${(recommendation.confidence * 100).toFixed(0)}%`} 
                size="small" 
                color="primary"
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {recommendation.description}
            </Typography>
            
            {recommendation.suggestions && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Suggestions:</Typography>
                <AvatarGroup max={5}>
                  {recommendation.suggestions.map((suggestion, index) => (
                    <Tooltip key={index} title={suggestion.label || suggestion.node?.label || suggestion.type}>
                      <Avatar
                        sx={{ 
                          width: 32, 
                          height: 32,
                          bgcolor: 'primary.main',
                          fontSize: '0.75rem'
                        }}
                      >
                        {(suggestion.label || suggestion.node?.label || suggestion.type || '?')[0]}
                      </Avatar>
                    </Tooltip>
                  ))}
                </AvatarGroup>
              </Box>
            )}
          </CardContent>
          <CardActions>
            <Button 
              size="small" 
              onClick={() => handleRecommendationAction(recommendation)}
            >
              Explore
            </Button>
            <Button size="small">
              Save
            </Button>
          </CardActions>
        </Card>
      ))}
    </List>
  );

  const renderAnomalies = () => (
    <List>
      {anomalies.map((anomaly) => (
        <Card key={anomaly.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <BugReport color="warning" />
              <Typography variant="h6">{anomaly.title}</Typography>
              <Chip 
                label={anomaly.riskLevel} 
                size="small" 
                color={getSeverityColor(anomaly.severity)}
              />
              <Chip 
                label={`${(anomaly.confidence * 100).toFixed(0)}%`} 
                size="small" 
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {anomaly.description}
            </Typography>
            {anomaly.entity && (
              <Typography variant="caption" color="text.secondary">
                Entity: {anomaly.entity.label || anomaly.entity.id}
              </Typography>
            )}
          </CardContent>
          <CardActions>
            <Button 
              size="small" 
              onClick={() => handleAnomalyAction(anomaly)}
            >
              Investigate
            </Button>
            <Button size="small">
              Flag
            </Button>
          </CardActions>
        </Card>
      ))}
    </List>
  );

  const renderPredictions = () => (
    <List>
      {predictions.map((prediction) => (
        <Card key={prediction.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp color="success" />
              <Typography variant="h6">{prediction.title}</Typography>
              <Chip 
                label={`${(prediction.confidence * 100).toFixed(0)}%`} 
                size="small" 
                color="success"
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {prediction.description}
            </Typography>
            
            {prediction.predictions && (
              <List dense>
                {prediction.predictions.slice(0, 3).map((pred, index) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <ListItemText
                      primary={
                        pred.source && pred.target 
                          ? `${pred.source.label} ↔ ${pred.target.label}`
                          : pred.node?.label || 'Prediction'
                      }
                      secondary={pred.reason || `Confidence: ${(pred.confidence * 100).toFixed(0)}%`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
          <CardActions>
            <Button size="small">
              Monitor
            </Button>
            <Button size="small">
              Notify
            </Button>
          </CardActions>
        </Card>
      ))}
    </List>
  );

  const tabContent = [
    { label: 'Insights', icon: <Psychology />, content: renderInsights() },
    { label: 'Recommendations', icon: <AutoAwesome />, content: renderRecommendations() },
    { label: 'Anomalies', icon: <BugReport />, content: renderAnomalies() },
    { label: 'Predictions', icon: <TrendingUp />, content: renderPredictions() }
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Typography variant="h6">
          AI Insights
        </Typography>
        <Box>
          <Tooltip title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}>
            <IconButton 
              size="small" 
              onClick={() => setAutoRefresh(!autoRefresh)}
              color={autoRefresh ? 'primary' : 'default'}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={generateInsights} disabled={loading}>
            <Analytics />
          </IconButton>
        </Box>
      </Box>

      {loading && <LinearProgress />}

      <Tabs 
        value={activeTab} 
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {tabContent.map((tab, index) => (
          <Tab 
            key={index}
            icon={
              <Badge 
                badgeContent={
                  index === 0 ? insights.length :
                  index === 1 ? recommendations.length :
                  index === 2 ? anomalies.length :
                  predictions.length
                } 
                color="primary"
              >
                {tab.icon}
              </Badge>
            }
            label={tab.label}
          />
        ))}
      </Tabs>

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
        {loading ? (
          <Box>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={100} sx={{ mb: 2 }} />
            ))}
          </Box>
        ) : (
          tabContent[activeTab]?.content
        )}

        {!loading && (
          <Box sx={{ mt: 2, p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Last updated: {formatDistanceToNow(new Date(), { addSuffix: true })}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default AIInsightsPanel;