import React, { useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import { useQuery, gql } from '@apollo/client';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola'; // Assuming cola layout is available or can be added
import dagre from 'cytoscape-dagre'; // Assuming dagre layout is available or can be added

// Register layouts if not already registered globally
cytoscape.use(cola);
cytoscape.use(dagre);

const GET_NARRATIVE_HEATMAP_DATA = gql`
  query GetNarrativeHeatmapData($scenarioId: ID!) {
    getNarrativeHeatmapData(scenarioId: $scenarioId) {
      id
      narrative
      intensity
      location # This will be a JSON object, e.g., { lat, lon } or { x, y } for network
      timestamp
    }
  }
`;

interface NarrativeHeatmapProps {
  scenarioId: string;
}

const NarrativeHeatmap: React.FC<NarrativeHeatmapProps> = ({ scenarioId }) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);

  const { loading, error, data } = useQuery(GET_NARRATIVE_HEATMAP_DATA, {
    variables: { scenarioId },
    pollInterval: 15000, // Poll every 15 seconds
  });

  useEffect(() => {
    if (cyRef.current && !cyInstance.current && data) {
      cyInstance.current = cytoscape({
        container: cyRef.current,
        elements: [], // Initial empty elements
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#666',
              label: 'data(narrative)',
              'text-valign': 'center',
              color: 'white',
              'text-outline-width': 2,
              'text-outline-color': '#333',
              width: 'mapData(intensity, 0, 10, 20, 80)', // Scale node size by intensity
              height: 'mapData(intensity, 0, 10, 20, 80)',
              'font-size': 'mapData(intensity, 0, 10, 8, 24)',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 3,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            },
          },
        ],
        layout: {
          name: 'cola', // Use cola for a force-directed layout
          animate: true,
          randomize: false,
          maxSimulationTime: 1500,
          fit: true,
          padding: 30,
          nodeDimensionsIncludeLabels: true,
        },
      });
    }

    if (cyInstance.current && data) {
      const cy = cyInstance.current;
      const elements: cytoscape.ElementDefinition[] = [];
      const narratives = new Set<string>();

      data.getNarrativeHeatmapData.forEach((item: any) => {
        narratives.add(item.narrative);
        elements.push({
          data: {
            id: item.id,
            narrative: item.narrative,
            intensity: item.intensity,
            location: item.location,
            timestamp: item.timestamp,
          },
        });
      });

      // Add dummy edges for visualization if needed, or infer from relationships
      // For a simple heatmap, nodes representing narratives might be enough.
      // If there are relationships between narratives (e.g., "supports", "counters"),
      // those would be added as edges. For now, just nodes.

      cy.json({ elements: elements });
      cy.layout({ name: 'cola' }).run(); // Re-run layout on data update
    }
  }, [data]); // Re-run effect when data changes

  useEffect(() => {
    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
        cyInstance.current = null;
      }
    };
  }, []);

  if (loading) return <CircularProgress />;
  if (error)
    return (
      <Alert severity="error">
        Error loading heatmap data: {error.message}
      </Alert>
    );

  const heatmapData = data?.getNarrativeHeatmapData || [];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Narrative Heatmaps
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        WAR-GAMED SIMULATION - Visualizations are based on simulated data and
        for decision support only.
      </Alert>

      {heatmapData.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          No narrative heatmap data available for this scenario yet. Run a
          simulation to generate data.
        </Typography>
      ) : (
        <Paper elevation={3} sx={{ p: 2, height: 600, width: '100%' }}>
          <div ref={cyRef} style={{ width: '100%', height: '100%' }} />
        </Paper>
      )}
    </Box>
  );
};

export default NarrativeHeatmap;
