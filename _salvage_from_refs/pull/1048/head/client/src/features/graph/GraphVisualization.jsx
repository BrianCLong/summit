import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import dagre from 'cytoscape-dagre';
import cola from 'cytoscape-cola'; // Import cola
import { Box, Button, Typography, Switch, FormControlLabel, TextField } from '@mui/material';
import $ from 'jquery'; // Import jQuery
import { debounce } from 'lodash'; // Import debounce

import { 
  setSelectedNode, 
  setSelectedEdge, 
  setLayout, 
  toggleFeature, 
  toggleClusterExpansion, 
  setSearchTerm, // New import for search
  addNode, // New import for editing
  addEdge, // New import for editing
  deleteNode, // New import for editing
  deleteEdge, // New import for editing
  setNodeTypeColor, // New import for customizable styling
} from '../../store/slices/graphSlice';

// Register Cytoscape.js extensions
cytoscape.use(coseBilkent);
cytoscape.use(dagre);
cytoscape.use(cola); // Register cola

const GraphVisualization = () => {
  const cyRef = useRef(null);
  const prevNodesRef = useRef([]);
  const prevEdgesRef = useRef([]);
  const graphData = useSelector((state) => state.graph);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!cyRef.current) {
      const cy = cytoscape({
        container: document.getElementById('cy'),
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(typeColors)', // Use data(typeColors) for dynamic coloring
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
          {
            selector: 'node.cy-expand-collapse-collapsed-node',
            style: {
              'background-color': '#888',
              'shape': 'roundrectangle',
              'label': 'data(id)',
              'text-valign': 'center',
              'color': 'white',
              'text-outline-width': 2,
              'text-outline-color': '#555',
            },
          },
        ],
        layout: {
          name: 'cola', // Default to cola layout
          ...graphData.layoutOptions,
          fit: true, // Fit to viewport
          padding: 50, // Padding around the graph
        },
        zoomingEnabled: true,
        userZoomingEnabled: true,
        panningEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
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

      // Handle cluster node taps
      cy.on('tap', 'node.cy-expand-collapse-collapsed-node', (evt) => {
        const clusterId = evt.target.id();
        dispatch(toggleClusterExpansion(clusterId));
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

    const cy = cyRef.current;
    if (!cy) return;

    // --- Incremental Update Logic ---
    const currentNodes = graphData.nodes.filter(node => 
      graphData.searchTerm === '' || 
      node.data.id.toLowerCase().includes(graphData.searchTerm.toLowerCase()) ||
      (node.data.label && node.data.label.toLowerCase().includes(graphData.searchTerm.toLowerCase()))
    );
    const currentEdges = graphData.edges.filter(edge => 
      graphData.searchTerm === '' || 
      edge.data.id.toLowerCase().includes(graphData.searchTerm.toLowerCase()) ||
      (edge.data.label && edge.data.label.toLowerCase().includes(graphData.searchTerm.toLowerCase())) ||
      currentNodes.some(node => node.data.id === edge.data.source) ||
      currentNodes.some(node => node.data.id === edge.data.target)
    );
    const prevNodes = prevNodesRef.current;
    const prevEdges = prevEdgesRef.current;

    const addedNodes = currentNodes.filter(node => !prevNodes.some(pNode => pNode.data.id === node.data.id));
    const removedNodes = prevNodes.filter(node => !currentNodes.some(cNode => cNode.data.id === node.data.id));
    const addedEdges = currentEdges.filter(edge => !prevEdges.some(pEdge => pEdge.data.id === edge.data.id));
    const removedEdges = prevEdges.filter(edge => !currentNodes.some(cNode => cNode.data.id === edge.data.source) && !currentNodes.some(cNode => cNode.data.id === edge.data.target) && !currentEdges.some(cEdge => cEdge.data.id === edge.data.id));

    if (graphData.featureToggles.incrementalLayout && (addedNodes.length > 0 || removedNodes.length > 0 || addedEdges.length > 0 || removedEdges.length > 0)) {
      // Remove elements
      removedNodes.forEach(node => cy.remove(cy.$('#' + node.data.id)));
      removedEdges.forEach(edge => cy.remove(cy.$('#' + edge.data.id)));

      // Add elements
      const elementsToAdd = [];
      addedNodes.forEach(node => elementsToAdd.push({ ...node, data: { ...node.data, typeColors: graphData.nodeTypeColors[node.data.type] || '#666' } }));
      addedEdges.forEach(edge => elementsToAdd.push(edge));

      if (elementsToAdd.length > 0) {
        cy.add(elementsToAdd);
        // Apply layout only to newly added elements or affected area
        // For cola, simply adding elements will cause them to be positioned by the force simulation
        // A full re-layout might still be needed if the graph structure changes significantly
        cy.layout({
          name: graphData.layout,
          ...graphData.layoutOptions,
          animate: graphData.featureToggles.smoothTransitions,
          animationDuration: 500,
        }).run();
      }
    } else if (!graphData.featureToggles.incrementalLayout || (addedNodes.length === 0 && removedNodes.length === 0 && addedEdges.length === 0 && removedEdges.length === 0)) {
      // Full re-render if incremental layout is off or no changes detected
      // Prepare elements for Cytoscape.js, considering clustering
      let elementsToRender = [];
      if (graphData.featureToggles.nodeClustering) {
        // Add cluster parent nodes
        const clusterParentNodes = graphData.clusters.map(cluster => ({
          data: { id: cluster.id, label: `Cluster (${cluster.type})`, typeColors: '#888' },
        }));
        elementsToRender.push(...clusterParentNodes);

        // Add actual nodes, assigning parents if clustered and expanded
        graphData.nodes.forEach(node => {
          const cluster = graphData.clusters.find(c => c.nodes.includes(node.data.id));
          if (cluster && cluster.isExpanded) {
            elementsToRender.push({ ...node, data: { ...node.data, parent: cluster.id, typeColors: graphData.nodeTypeColors[node.data.type] || '#666' } });
          } else if (!cluster) {
            elementsToRender.push({ ...node, data: { ...node.data, typeColors: graphData.nodeTypeColors[node.data.type] || '#666' } });
          }
        });

        // Add edges, ensuring they connect to parent if both ends are in a collapsed cluster
        graphData.edges.forEach(edge => {
          const sourceNode = graphData.nodes.find(n => n.data.id === edge.data.source);
          const targetNode = graphData.nodes.find(n => n.data.id === edge.data.target);

          const sourceCluster = graphData.clusters.find(c => c.nodes.includes(sourceNode.data.id));
          const targetCluster = graphData.clusters.find(c => c.nodes.includes(targetNode.data.id));

          let newSource = edge.data.source;
          let newTarget = edge.data.target;

          if (sourceCluster && !sourceCluster.isExpanded) {
            newSource = sourceCluster.id;
          }
          if (targetCluster && !targetCluster.isExpanded) {
            newTarget = targetCluster.id;
          }

          // Only add edge if source and target are not the same (e.g., both in same collapsed cluster)
          if (newSource !== newTarget) {
            elementsToRender.push({ ...edge, data: { ...edge.data, source: newSource, target: newTarget } });
          }
        });

      } else {
        elementsToRender = graphData.nodes.map(node => ({ ...node, data: { ...node.data, typeColors: graphData.nodeTypeColors[node.data.type] || '#666' } })).concat(graphData.edges);
      }
      cy.json({ elements: elementsToRender });
    }

    // Hide/show nodes based on cluster expansion state
    graphData.nodes.forEach(node => {
      const cyNode = cy.$('#' + node.data.id);
      const cluster = graphData.clusters.find(c => c.nodes.includes(node.data.id));
      if (cluster && !cluster.isExpanded && graphData.featureToggles.nodeClustering) {
        cyNode.hide();
      } else {
        cyNode.show();
      }
    });

    // Re-run layout if not incremental or if layout changed
    if (!graphData.featureToggles.incrementalLayout || prevNodes.length === 0 || prevEdges.length === 0 || graphData.layout !== prevNodesRef.current.layout || graphData.layoutOptions !== prevNodesRef.current.layoutOptions) {
      cy.layout({
        name: graphData.layout,
        ...graphData.layoutOptions,
        animate: graphData.featureToggles.smoothTransitions,
        animationDuration: 500,
      }).run();
    }

    // Apply selection from Redux state
    cy.$('.selected').removeClass('selected');
    if (graphData.selectedNode) {
      cy.$('#' + graphData.selectedNode).addClass('selected');
    }
    if (graphData.selectedEdge) {
      cy.$('#' + graphData.selectedEdge).addClass('selected');
    }

    // Update refs for next render
    prevNodesRef.current = currentNodes;
    prevEdgesRef.current = currentEdges;

  }, [graphData.nodes, graphData.edges, graphData.layout, graphData.layoutOptions, graphData.selectedNode, graphData.selectedEdge, graphData.featureToggles.smoothTransitions, graphData.featureToggles.edgeHighlighting, graphData.featureToggles.nodeClustering, graphData.featureToggles.incrementalLayout, graphData.clusters, graphData.nodeTypeColors, dispatch]);

  const handleLayoutChange = (layoutName, options = {}) => {
    dispatch(setLayout({ name: layoutName, options }));
  };

  const handleToggleFeature = (featureName) => (event) => {
    dispatch(toggleFeature({ featureName, enabled: event.target.checked }));
  };

  // jQuery example: Animate a simple message box
  const animateMessageBox = () => {
    $('#message-box').slideToggle('slow');
  };

  const handleAddNode = () => {
    const newNodeId = `node_${Date.now()}`;
    dispatch(addNode({ data: { id: newNodeId, label: `New Node ${newNodeId.substring(newNodeId.length - 4)}`, type: 'generic' } }));
  };

  const handleDeleteSelected = () => {
    if (graphData.selectedNode) {
      dispatch(deleteNode(graphData.selectedNode));
      dispatch(setSelectedNode(null)); // Deselect after deletion
    } else if (graphData.selectedEdge) {
      dispatch(deleteEdge(graphData.selectedEdge));
      dispatch(setSelectedEdge(null)); // Deselect after deletion
    }
  };

  const handleUpdateNodeLabel = (newLabel) => {
    if (graphData.selectedNode) {
      dispatch(updateNode({ id: graphData.selectedNode, label: newLabel }));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="h6">IntelGraph Visualization</Typography>
        <Button onClick={() => handleLayoutChange('cose-bilkent')} variant="contained" sx={{ mr: 1 }}>Cose Bilkent Layout</Button>
        <Button onClick={() => handleLayoutChange('dagre')} variant="contained" sx={{ mr: 1 }}>Dagre Layout</Button>
        <Button onClick={() => handleLayoutChange('cola')} variant="contained" sx={{ mr: 1 }}>Cola Layout</Button>
        <Button onClick={animateMessageBox} variant="contained" sx={{ mr: 1 }}>Toggle Message Box (jQuery)</Button>
        <FormControlLabel
          control={
            <Switch
              checked={graphData.featureToggles.nodeClustering}
              onChange={handleToggleFeature('nodeClustering')}
              name="nodeClustering"
            />
          }
          label="Node Clustering"
        />
        <TextField
          label="Search Nodes/Edges"
          variant="outlined"
          size="small"
          value={graphData.searchTerm}
          onChange={(e) => dispatch(setSearchTerm(e.target.value))}
          sx={{ ml: 2, width: '200px' }}
        />
        <Button onClick={handleAddNode} variant="contained" sx={{ ml: 2 }}>Add Node</Button>
        <Button onClick={handleDeleteSelected} variant="contained" color="error" sx={{ ml: 1 }} disabled={!graphData.selectedNode && !graphData.selectedEdge}>Delete Selected</Button>
      </Box>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="subtitle1">Feature Toggles:</Typography>
        {Object.entries(graphData.featureToggles).map(([key, value]) => (
          <FormControlLabel
            key={key}
            control={
              <Switch
                checked={value}
                onChange={handleToggleFeature(key)}
                name={key}
              />
            }
            label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
          />
        ))}
      </Box>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="subtitle1">Node Type Colors:</Typography>
        {Object.entries(graphData.nodeTypeColors).map(([type, color]) => (
          <Box key={type} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography sx={{ mr: 1 }}>{type}:</Typography>
            <input
              type="color"
              value={color}
              onChange={(e) => dispatch(setNodeTypeColor({ type, color: e.target.value }))}
            />
          </Box>
        ))}
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