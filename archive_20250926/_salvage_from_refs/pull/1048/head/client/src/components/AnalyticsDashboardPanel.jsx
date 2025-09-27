import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Alert, List, ListItem, ListItemText } from '@mui/material';
import { useMutation, gql, useQuery } from '@apollo/client';
import cytoscape from 'cytoscape';

// GraphQL Mutation to trigger community detection
const RUN_COMMUNITY_DETECTION_MUTATION = gql`
  mutation RunCommunityDetection {
    runCommunityDetection {
      message
      communitiesDetected
      nodesUpdated
    }
  }
`;

// GraphQL Query to fetch nodes with community_id
const GET_NODES_WITH_COMMUNITY_ID_QUERY = gql`
  query GetNodesWithCommunityId {
    nodes {
      id
      properties {
        key
        value
      }
    }
    relationships {
      id
      source
      target
      type
    }
  }
`;

const AnalyticsDashboardPanel = () => {
  const [triggerDetection] = useMutation(RUN_COMMUNITY_DETECTION_MUTATION);
  const { loading, error, data, refetch } = useQuery(GET_NODES_WITH_COMMUNITY_ID_QUERY);
  const [detectionResult, setDetectionResult] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const cyRef = useRef(null); // Ref for Cytoscape container

  useEffect(() => {
    if (data && data.nodes && data.relationships) {
      initializeCytoscape(data.nodes, data.relationships);
    }
  }, [data]);

  const handleRunDetection = async () => {
    setIsDetecting(true);
    setDetectionResult(null);
    try {
      const { data } = await triggerDetection();
      setDetectionResult(data.runCommunityDetection);
      await refetch(); // Refetch graph data to get updated community_ids
    } catch (err) {
      console.error("Error triggering community detection:", err);
      setDetectionResult({ message: `Error: ${err.message}` });
    } finally {
      setIsDetecting(false);
    }
  };

  const initializeCytoscape = (nodes, relationships) => {
    if (cyRef.current) {
      const elements = [
        ...nodes.map(node => ({
          data: {
            id: node.id,
            label: node.id,
            community_id: node.properties.find(p => p.key === 'community_id')?.value || 'unassigned'
          }
        })),
        ...relationships.map(rel => ({
          data: {
            id: rel.id,
            source: rel.source,
            target: rel.target,
            label: rel.type
          }
        }))
      ];

      const uniqueCommunityIds = [...new Set(nodes.map(node => node.properties.find(p => p.key === 'community_id')?.value || 'unassigned'))];
      const colors = {};
      const colorPalette = [
        '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF',
        '#C0C0C0', '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
      ];
      uniqueCommunityIds.forEach((id, index) => {
        colors[id] = colorPalette[index % colorPalette.length];
      });

      cytoscape({
        container: cyRef.current,
        elements: elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': function(ele){ return colors[ele.data('community_id')] || '#666'; },
              'label': 'data(label)',
              'text-valign': 'center',
              'color': 'white',
              'text-outline-width': 2,
              'text-outline-color': '#333',
              'font-size': '10px'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 1,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier'
            }
          }
        ],
        layout: {
          name: 'cose', // A good general-purpose layout
          animate: false,
          padding: 10
        }
      });
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>AI Analytics Dashboard</Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={handleRunDetection}
        disabled={isDetecting || loading}
        sx={{ mb: 2 }}
      >
        {isDetecting ? <CircularProgress size={24} /> : "Run Community Detection"}
      </Button>

      {detectionResult && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">Detection Result:</Typography>
          <List dense>
            <ListItem><ListItemText primary={`Message: ${detectionResult.message}`} /></ListItem>
            {detectionResult.communitiesDetected !== undefined && (
              <ListItem><ListItemText primary={`Communities Detected: ${detectionResult.communitiesDetected}`} /></ListItem>
            )}
            {detectionResult.nodesUpdated !== undefined && (
              <ListItem><ListItemText primary={`Nodes Updated: ${detectionResult.nodesUpdated}`} /></ListItem>
            )}
          </List>
        </Box>
      )}

      {loading && <CircularProgress sx={{ mt: 2 }} />}
      {error && <Alert severity="error" sx={{ mt: 2 }}>Error fetching graph data: {error.message}</Alert>}

      <Typography variant="h6" sx={{ mt: 3 }}>Graph Visualization (Communities)</Typography>
      <Box ref={cyRef} sx={{ width: '100%', height: '400px', border: '1px solid #ccc', mt: 2 }} />
    </Paper>
  );
};

export default AnalyticsDashboardPanel;
