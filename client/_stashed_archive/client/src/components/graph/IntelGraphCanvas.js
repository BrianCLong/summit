import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { Grid, Box, CircularProgress, Typography } from '@mui/material'; // Import CircularProgress and Typography
import { useDispatch, useSelector } from 'react-redux'; // Import useDispatch and useSelector
import { fetchGraphData } from '../../store/slices/graphSlice'; // Import fetchGraphData

// Import panel components
import EntitiesPanel from '../panels/EntitiesPanel';
import RelationshipsPanel from '../panels/RelationshipsPanel';
import AISuggestionsPanel from '../panels/AISuggestionsPanel';
import CopilotRunsPanel from '../panels/CopilotRunsPanel';

function IntelGraphCanvas() {
  const cyRef = useRef(null);
  const dispatch = useDispatch();
  const { nodes, edges, status, error } = useSelector((state) => state.graph);

  useEffect(() => {
    dispatch(fetchGraphData()); // Dispatch the thunk to fetch data
  }, [dispatch]);

  useEffect(() => {
    if (cyRef.current && status === 'succeeded') {
      const cy = cytoscape({
        container: cyRef.current,
        elements: [
          ...nodes.map((node) => ({ data: { ...node } })),
          ...edges.map((edge) => ({ data: { ...edge } })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(color)' || '#0055A4', // Use color from data if available
              label: 'data(label)',
              color: '#FFFFFF',
              'text-valign': 'center',
              'text-halign': 'center',
              width: '60px',
              height: '60px',
              'font-size': '12px',
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
          name: 'grid',
          rows: 1,
        },
      });

      return () => {
        cy.destroy();
      };
    }
  }, [nodes, edges, status]); // Re-run effect when nodes, edges, or status change

  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Graph Data...
        </Typography>
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          color: 'error.main',
        }}
      >
        <Typography variant="h6">Error: {error}</Typography>
      </Box>
    );
  }

  const cyInstance = useRef(null); // To store the Cytoscape instance

  useEffect(() => {
    if (cyRef.current && status === 'succeeded') {
      const cy = cytoscape({
        container: cyRef.current,
        elements: [], // Initialize with empty elements
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(color)' || '#0055A4',
              label: 'data(label)',
              color: '#FFFFFF',
              'text-valign': 'center',
              'text-halign': 'center',
              width: '60px',
              height: '60px',
              'font-size': '12px',
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
          name: 'grid',
          rows: 1,
        },
      });

      cy.batch(() => {
        cy.add(nodes.map((node) => ({ data: { ...node } })));
        cy.add(edges.map((edge) => ({ data: { ...edge } })));
      });

      cyInstance.current = cy; // Store the instance

      return () => {
        cy.destroy();
      };
    }
  }, [nodes, edges, status]);

  const handleKeyDown = (event) => {
    if (!cyInstance.current) return;

    const cy = cyInstance.current;
    const panAmount = 50; // Pixels to pan
    const zoomAmount = 0.1; // Zoom factor

    switch (event.key) {
      case 'ArrowUp':
        cy.panBy({ x: 0, y: -panAmount });
        break;
      case 'ArrowDown':
        cy.panBy({ x: 0, y: panAmount });
        break;
      case 'ArrowLeft':
        cy.panBy({ x: -panAmount, y: 0 });
        break;
      case 'ArrowRight':
        cy.panBy({ x: panAmount, y: 0 });
        break;
      case '+':
        cy.zoom(cy.zoom() + zoomAmount);
        break;
      case '-':
        cy.zoom(cy.zoom() - zoomAmount);
        break;
      default:
        return; // Do nothing for other keys
    }
    event.preventDefault(); // Prevent default browser behavior (e.g., scrolling)
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', p: 2 }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid item xs={9}>
          <div
            ref={cyRef}
            style={{ width: '100%', height: '100%', border: '1px solid #ccc' }}
            tabIndex="0" // Make the div focusable
            onKeyDown={handleKeyDown}
          />
        </Grid>
        <Grid item xs={3}>
          <Grid
            container
            direction="column"
            spacing={2}
            sx={{ height: '100%' }}
          >
            <Grid item xs={6}>
              <EntitiesPanel />
            </Grid>
            <Grid item xs={6}>
              <RelationshipsPanel />
            </Grid>
            <Grid item xs={6}>
              <AISuggestionsPanel />
            </Grid>
            <Grid item xs={6}>
              <CopilotRunsPanel />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export default IntelGraphCanvas;
