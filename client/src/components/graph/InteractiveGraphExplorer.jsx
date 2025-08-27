import React, { useState, useEffect } from 'react';
import { Typography, Box, Card, CardContent, Button, Grid, Chip, Alert, CircularProgress } from '@mui/material';
import { useQuery } from '@apollo/client';
import { GET_GRAPH_DATA } from '../../graphql/graphData.gql';

const InteractiveGraphExplorer = () => {
  const [investigationId, setInvestigationId] = useState('demo-investigation-123');
  
  const { loading, error, data, refetch } = useQuery(GET_GRAPH_DATA, {
    variables: { investigationId },
    errorPolicy: 'all'
  });

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading graph data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        🕸️ Graph Explorer
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          GraphQL Error: {error.message}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Control Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Controls
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Investigation: {investigationId}
              </Typography>
              <Button 
                variant="contained" 
                onClick={handleRefresh}
                sx={{ mt: 1 }}
                disabled={loading}
              >
                Refresh Data
              </Button>
            </CardContent>
          </Card>

          {/* Graph Statistics */}
          {data && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Graph Statistics
                </Typography>
                <Typography variant="body1">
                  <strong>Nodes:</strong> {data.graphData.nodeCount}
                </Typography>
                <Typography variant="body1">
                  <strong>Edges:</strong> {data.graphData.edgeCount}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Graph Data Display */}
        <Grid item xs={12} md={8}>
          {data && data.graphData ? (
            <>
              {/* Nodes Section */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔵 Entities ({data.graphData.nodes.length})
                  </Typography>
                  <Grid container spacing={1}>
                    {data.graphData.nodes.map((node) => (
                      <Grid item key={node.id}>
                        <Card variant="outlined" sx={{ p: 1, minWidth: 200 }}>
                          <Typography variant="subtitle2">
                            {node.label}
                          </Typography>
                          <Chip 
                            label={node.type} 
                            size="small" 
                            color="primary" 
                            sx={{ mr: 1, mb: 1 }}
                          />
                          {node.confidence && (
                            <Chip 
                              label={`${(node.confidence * 100).toFixed(0)}%`} 
                              size="small" 
                              color="success"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          )}
                          {node.attack_ttps && node.attack_ttps.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                MITRE TTPs:
                              </Typography>
                              <Box>
                                {node.attack_ttps.map((ttp) => (
                                  <Chip 
                                    key={ttp}
                                    label={ttp} 
                                    size="small" 
                                    variant="outlined"
                                    color="warning"
                                    sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7em' }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                          {node.triage_score && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Triage Score: {(node.triage_score * 100).toFixed(0)}%
                            </Typography>
                          )}
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

              {/* Relationships Section */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔗 Relationships ({data.graphData.edges.length})
                  </Typography>
                  {data.graphData.edges.map((edge) => {
                    const fromNode = data.graphData.nodes.find(n => n.id === edge.fromEntityId);
                    const toNode = data.graphData.nodes.find(n => n.id === edge.toEntityId);
                    
                    return (
                      <Card key={edge.id} variant="outlined" sx={{ mb: 1, p: 2 }}>
                        <Typography variant="body1">
                          <strong>{fromNode?.label}</strong>
                          {' '} → {' '}
                          <Chip label={edge.type} size="small" color="secondary" sx={{ mx: 1 }} />
                          {' '} → {' '}
                          <strong>{toNode?.label}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {edge.description}
                        </Typography>
                        {edge.confidence && (
                          <Chip 
                            label={`Confidence: ${(edge.confidence * 100).toFixed(0)}%`} 
                            size="small" 
                            color="info"
                            sx={{ mt: 1, mr: 1 }}
                          />
                        )}
                        {edge.since && (
                          <Chip 
                            label={`Since: ${edge.since}`} 
                            size="small" 
                            variant="outlined"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Graph Visualization
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  No graph data available. Click "Refresh Data" to load.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default InteractiveGraphExplorer;
