
import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import dagre from 'cytoscape-dagre';
import { Box, Button, Typography } from '@mui/material';
import $ from 'jquery'; // Import jQuery

import { setSelectedNode, setSelectedEdge, setLayout } from '../../store/slices/graphSlice';

// Register Cytoscape.js extensions
cytoscape.use(coseBilkent);
cytoscape.use(dagre);

const GraphVisualization = () => {
  const cyRef = useRef(null);
  const graphData = useSelector((state) => state.graph);
  const dispatch = useDispatch();

  import { debounce } from 'lodash'; // Import debounce

  useEffect(() => {
    if (!cyRef.current) {
      const cy = cytoscape({
        container: document.getElementById('cy'),
        elements: [...graphData.nodes, ...graphData.edges],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#666',
              'label': 'data(id)',
              'text-valign': 'center',
              'color': 'white',
              'text-outline-width': 2,
              'text-outline-color': '#333',
            },
          },
          {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            },
          },
          {
            selector: 'node.selected',
            style: {
              'background-color': '#FFD700', // Gold for selected node
              'line-color': '#FFD700',
              'target-arrow-color': '#FFD700',
              'source-arrow-color': '#FFD700',
              'border-width': 2,
              'border-color': '#FFD700',
            },
          },
          {
            selector: 'edge.selected',
            style: {
              'line-color': '#FFD700', // Gold for selected edge
              'target-arrow-color': '#FFD700',
              'source-arrow-color': '#FFD700',
            },
          },
          {
            selector: 'edge.highlighted',
            style: {
              'line-color': '#ADD8E6', // Light blue for highlighted edges
              'target-arrow-color': '#ADD8E6',
              'source-arrow-color': '#ADD8E6',
              'width': 5,
            },
          },
        ],
        layout: {
          name: graphData.layout,
          ...graphData.layoutOptions,
        },
      });

      cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        dispatch(setSelectedNode(node.id()));

        // Highlight connected edges
        cy.elements().removeClass('highlighted');
        if (graphData.featureToggles.edgeHighlighting) {
          node.connectedEdges().addClass('highlighted');
        }
      });

      cy.on('tap', 'edge', (evt) => {
        const edge = evt.target;
        dispatch(setSelectedEdge(edge.id()));
        cy.elements().removeClass('highlighted');
      });

      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          // Tapped on background
          dispatch(setSelectedNode(null));
          dispatch(setSelectedEdge(null));
          cy.elements().removeClass('highlighted');
        }
      });

      cyRef.current = cy;

      // Debounce resize event
      const debouncedResize = debounce(() => {
        cy.resize();
        cy.fit();
      }, 250);

      window.addEventListener('resize', debouncedResize);

      return () => {
        window.removeEventListener('resize', debouncedResize);
      };
    }

    // Update graph elements when Redux state changes
    if (cyRef.current) {
      cyRef.current.json({ elements: { nodes: graphData.nodes, edges: graphData.edges } });
      cyRef.current.layout({
        name: graphData.layout,
        ...graphData.layoutOptions,
        animate: graphData.featureToggles.smoothTransitions, // Use feature toggle for animation
        animationDuration: 500,
      }).run();

      // Apply selection from Redux state
      cyRef.current.$('.selected').removeClass('selected');
      if (graphData.selectedNode) {
        cyRef.current.$('#' + graphData.selectedNode).addClass('selected');
      }
      if (graphData.selectedEdge) {
        cyRef.current.$('#' + graphData.selectedEdge).addClass('selected');
      }
    }
  }, [graphData.nodes, graphData.edges, graphData.layout, graphData.layoutOptions, graphData.selectedNode, graphData.selectedEdge, graphData.featureToggles.smoothTransitions, graphData.featureToggles.edgeHighlighting, dispatch]);

  const handleLayoutChange = (layoutName, options = {}) => {
    dispatch(setLayout({ name: layoutName, options }));
  };

  // jQuery example: Animate a simple message box
  const animateMessageBox = () => {
    $('#message-box').slideToggle('slow');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="h6">IntelGraph Visualization</Typography>
        <Button onClick={() => handleLayoutChange('cose-bilkent')} variant="contained" sx={{ mr: 1 }}>Cose Bilkent Layout</Button>
        <Button onClick={() => handleLayoutChange('dagre')} variant="contained" sx={{ mr: 1 }}>Dagre Layout</Button>
        <Button onClick={animateMessageBox} variant="contained">Toggle Message Box (jQuery)</Button>
      </Box>
      <Box id="message-box" sx={{ p: 2, bgcolor: 'info.light', display: 'none' }}>
        <Typography>This is a message box animated with jQuery!</Typography>
      </Box>
      <Box id="cy" sx={{ flexGrow: 1, border: '1px solid #ddd' }}></Box>
      <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
        <Typography>Selected Node: {graphData.selectedNode || 'None'}</Typography>
        <Typography>Selected Edge: {graphData.selectedEdge || 'None'}</Typography>
      </Box>
    </Box>
  );
};

export default GraphVisualization;
