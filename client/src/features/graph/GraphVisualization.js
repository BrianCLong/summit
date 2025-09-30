import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import dagre from 'cytoscape-dagre';
import cola from 'cytoscape-cola'; // Import cola
import qtip from 'cytoscape-qtip'; // Import qtip
import contextMenus from 'cytoscape-context-menus'; // Import context menus
import {
  Box,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Select,
  Slider,
  InputLabel,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from '@mui/material';
import $ from 'jquery'; // Import jQuery
import { debounce } from 'lodash'; // Import debounce
import RbacSidePanel from './RbacSidePanel';

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
  undo, // New import for undo/redo
  redo, // New import for undo/redo
  setPathSourceNode, // New import for pathfinding
  setPathTargetNode, // New import for pathfinding
  setFoundPath, // New import for pathfinding
  setLoading, // New import for loading indicator
  setErrorMessage, // New import for error messages
  setNodeTypeFilter, // New import for node type filter
  setMinConfidenceFilter, // New import for min confidence filter
} from '../../store/slices/graphSlice';

// Register Cytoscape.js extensions
cytoscape.use(coseBilkent);
cytoscape.use(dagre);
cytoscape.use(cola); // Register cola
cytoscape.use(qtip); // Register qtip
cytoscape.use(contextMenus); // Register context menus

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
              label: 'data(id)',
              'text-valign': 'center',
              color: 'white',
              'text-outline-width': 2,
              'text-outline-color': '#333',
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
              opacity: 'data(confidence)', // Opacity based on confidence
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
              width: 5,
            },
          },
          {
            selector: 'node.cy-expand-collapse-collapsed-node',
            style: {
              'background-color': '#888',
              shape: 'roundrectangle',
              label: 'data(id)',
              'text-valign': 'center',
              color: 'white',
              'text-outline-width': 2,
              'text-outline-color': '#555',
            },
          },
          {
            selector: 'node.path-node',
            style: {
              'background-color': '#FF0000', // Red for path nodes
            },
          },
          {
            selector: 'edge.path-edge',
            style: {
              'line-color': '#FF0000', // Red for path edges
              'target-arrow-color': '#FF0000',
              width: 5,
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

      // Add qTip tooltips
      cy.elements().qtip({
        content: function () {
          let content = '';
          if (this.isNode()) {
            content = `<strong>Node: ${this.id()}</strong><br/>`;
            if (this.data('provenance')) {
              content += `Provenance: ${this.data('provenance')}<br/>`;
            }
            if (this.data('type')) {
              content += `Type: ${this.data('type')}<br/>`;
            }
          } else if (this.isEdge()) {
            content = `<strong>Edge: ${this.id()}</strong><br/>`;
            if (this.data('provenance')) {
              content += `Provenance: ${this.data('provenance')}<br/>`;
            }
            if (this.data('confidence')) {
              content += `Confidence: ${this.data('confidence')}<br/>`;
            }
          }
          return content;
        },
        position: {
          my: 'top center',
          at: 'bottom center',
        },
        style: {
          classes: 'qtip-bootstrap',
          tip: { width: 16, height: 8 },
        },
      });

      // Initialize context menus
      cy.contextMenus({
        evtType: 'cxttap', // 'cxttap' for right-click on desktop, long-press on touch
        menuItems: [
          {
            id: 'add-node',
            content: 'Add Node',
            selector: 'core', // Applies to graph background
            onClickFunction: (evt) => {
              const newNodeId = `node_${Date.now()}`;
              dispatch(
                addNode({
                  data: {
                    id: newNodeId,
                    label: `New Node ${newNodeId.substring(newNodeId.length - 4)}`,
                    type: 'generic',
                  },
                }),
              );
            },
            has: 'core', // Show only on core
          },
          {
            id: 'delete-selected',
            content: 'Delete Selected',
            selector: 'node, edge', // Applies to nodes and edges
            onClickFunction: (evt) => {
              const elementId = evt.target.id();
              if (evt.target.isNode()) {
                dispatch(deleteNode(elementId));
                dispatch(setSelectedNode(null));
              } else if (evt.target.isEdge()) {
                dispatch(deleteEdge(elementId));
                dispatch(setSelectedEdge(null));
              }
            },
            has: 'node, edge', // Show only on nodes or edges
          },
          {
            id: 'edit-node',
            content: 'Edit Node',
            selector: 'node', // Applies to nodes
            onClickFunction: (evt) => {
              dispatch(setSelectedNode(evt.target.id()));
              // In a real app, this would open an edit dialog
              alert(`Editing node: ${evt.target.id()}`);
            },
            has: 'node', // Show only on nodes
          },
          {
            id: 'find-path-source',
            content: 'Set as Path Source',
            selector: 'node',
            onClickFunction: (evt) => {
              dispatch(setPathSourceNode(evt.target.id()));
            },
            has: 'node',
          },
          {
            id: 'find-path-target',
            content: 'Set as Path Target',
            selector: 'node',
            onClickFunction: (evt) => {
              dispatch(setPathTargetNode(evt.target.id()));
            },
            has: 'node',
          },
        ],
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
    const currentNodes = graphData.nodes.filter(
      (node) =>
        (graphData.searchTerm === '' ||
          node.data.id.toLowerCase().includes(graphData.searchTerm.toLowerCase()) ||
          (node.data.label &&
            node.data.label.toLowerCase().includes(graphData.searchTerm.toLowerCase()))) &&
        (graphData.nodeTypeFilter.length === 0 ||
          graphData.nodeTypeFilter.includes(node.data.type)),
    );
    const currentEdges = graphData.edges.filter(
      (edge) =>
        (graphData.searchTerm === '' ||
          edge.data.id.toLowerCase().includes(graphData.searchTerm.toLowerCase()) ||
          (edge.data.label &&
            edge.data.label.toLowerCase().includes(graphData.searchTerm.toLowerCase())) ||
          currentNodes.some((node) => node.data.id === edge.data.source) ||
          currentNodes.some((node) => node.data.id === edge.data.target)) &&
        (edge.data.confidence === undefined ||
          edge.data.confidence >= graphData.minConfidenceFilter),
    );
    const prevNodes = prevNodesRef.current;
    const prevEdges = prevEdgesRef.current;

    const addedNodes = currentNodes.filter(
      (node) => !prevNodes.some((pNode) => pNode.data.id === node.data.id),
    );
    const removedNodes = prevNodes.filter(
      (node) => !currentNodes.some((cNode) => cNode.data.id === node.data.id),
    );
    const addedEdges = currentEdges.filter(
      (edge) => !prevEdges.some((pEdge) => pEdge.data.id === edge.data.id),
    );
    const removedEdges = prevEdges.filter(
      (edge) =>
        !currentNodes.some((cNode) => cNode.data.id === edge.data.source) &&
        !currentNodes.some((cNode) => cNode.data.id === edge.data.target) &&
        !currentEdges.some((cEdge) => cEdge.data.id === edge.data.id),
    );

    if (
      graphData.featureToggles.incrementalLayout &&
      (addedNodes.length > 0 ||
        removedNodes.length > 0 ||
        addedEdges.length > 0 ||
        removedEdges.length > 0)
    ) {
      // Remove elements
      removedNodes.forEach((node) => cy.remove(cy.$('#' + node.data.id)));
      removedEdges.forEach((edge) => cy.remove(cy.$('#' + edge.data.id)));

      // Add elements
      const elementsToAdd = [];
      addedNodes.forEach((node) =>
        elementsToAdd.push({
          ...node,
          data: { ...node.data, typeColors: graphData.nodeTypeColors[node.data.type] || '#666' },
        }),
      );
      addedEdges.forEach((edge) => elementsToAdd.push(edge));

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
    } else if (
      !graphData.featureToggles.incrementalLayout ||
      (addedNodes.length === 0 &&
        removedNodes.length === 0 &&
        addedEdges.length === 0 &&
        removedEdges.length === 0)
    ) {
      // Full re-render if incremental layout is off or no changes detected
      // Prepare elements for Cytoscape.js, considering clustering
      let elementsToRender = [];
      if (graphData.featureToggles.nodeClustering) {
        // Add cluster parent nodes
        const clusterParentNodes = graphData.clusters.map((cluster) => ({
          data: { id: cluster.id, label: `Cluster (${cluster.type})`, typeColors: '#888' },
        }));
        elementsToRender.push(...clusterParentNodes);

        // Add actual nodes, assigning parents if clustered and expanded
        graphData.nodes.forEach((node) => {
          const cluster = graphData.clusters.find((c) => c.nodes.includes(node.data.id));
          if (cluster && cluster.isExpanded) {
            elementsToRender.push({
              ...node,
              data: {
                ...node.data,
                parent: cluster.id,
                typeColors: graphData.nodeTypeColors[node.data.type] || '#666',
              },
            });
          } else if (!cluster) {
            elementsToRender.push({
              ...node,
              data: {
                ...node.data,
                typeColors: graphData.nodeTypeColors[node.data.type] || '#666',
              },
            });
          }
        });

        // Add edges, ensuring they connect to parent if both ends are in a collapsed cluster
        graphData.edges.forEach((edge) => {
          const sourceNode = graphData.nodes.find((n) => n.data.id === edge.data.source);
          const targetNode = graphData.nodes.find((n) => n.data.id === edge.data.target);

          const sourceCluster = graphData.clusters.find((c) =>
            c.nodes.includes(sourceNode.data.id),
          );
          const targetCluster = graphData.clusters.find((c) =>
            c.nodes.includes(targetNode.data.id),
          );

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
            elementsToRender.push({
              ...edge,
              data: { ...edge.data, source: newSource, target: newTarget },
            });
          }
        });
      } else {
        elementsToRender = graphData.nodes
          .map((node) => ({
            ...node,
            data: { ...node.data, typeColors: graphData.nodeTypeColors[node.data.type] || '#666' },
          }))
          .concat(graphData.edges);
      }
      cy.json({ elements: elementsToRender });
    }

    // Hide/show nodes based on cluster expansion state
    graphData.nodes.forEach((node) => {
      const cyNode = cy.$('#' + node.data.id);
      const cluster = graphData.clusters.find((c) => c.nodes.includes(node.data.id));
      if (cluster && !cluster.isExpanded && graphData.featureToggles.nodeClustering) {
        cyNode.hide();
      } else {
        cyNode.show();
      }
    });

    // Re-run layout if not incremental or if layout changed
    if (
      !graphData.featureToggles.incrementalLayout ||
      prevNodes.length === 0 ||
      prevEdges.length === 0 ||
      graphData.layout !== prevNodesRef.current.layout ||
      graphData.layoutOptions !== prevNodesRef.current.layoutOptions
    ) {
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

    // Highlight found path
    cy.elements().removeClass('path-node path-edge');
    graphData.foundPath.forEach((id) => {
      cy.$('#' + id).addClass('path-node path-edge');
    });

    // Update refs for next render
    prevNodesRef.current = currentNodes;
    prevEdgesRef.current = currentEdges;
  }, [
    graphData.nodes,
    graphData.edges,
    graphData.layout,
    graphData.layoutOptions,
    graphData.selectedNode,
    graphData.selectedEdge,
    graphData.featureToggles.smoothTransitions,
    graphData.featureToggles.edgeHighlighting,
    graphData.featureToggles.nodeClustering,
    graphData.featureToggles.incrementalLayout,
    graphData.clusters,
    graphData.nodeTypeColors,
    graphData.foundPath,
    graphData.searchTerm,
    graphData.nodeTypeFilter,
    graphData.minConfidenceFilter,
    dispatch,
  ]);

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
    dispatch(
      addNode({
        data: {
          id: newNodeId,
          label: `New Node ${newNodeId.substring(newNodeId.length - 4)}`,
          type: 'generic',
        },
      }),
    );
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

  const handleZoomToFit = () => {
    if (cyRef.current) {
      cyRef.current.fit();
    }
  };

  const handleZoomToSelection = () => {
    if (cyRef.current) {
      const selectedElements = cyRef.current.$('.selected');
      if (selectedElements.length > 0) {
        cyRef.current.fit(selectedElements);
      }
    }
  };

  const handleFindPath = () => {
    if (!cyRef.current || !graphData.pathSourceNode || !graphData.pathTargetNode) return;

    const cy = cyRef.current;
    const sourceNode = cy.$('#' + graphData.pathSourceNode);
    const targetNode = cy.$('#' + graphData.pathTargetNode);

    if (sourceNode.empty() || targetNode.empty()) {
      dispatch(setFoundPath([]));
      return;
    }

    const bfs = cy.elements().bfs({
      roots: sourceNode,
      // directed: true, // Uncomment if graph is directed
      visit: function (v, e, u, i, depth) {
        // console.log('visit ' + v.id());
      },
      // tear: function(v, e, u, i, depth){
      //   console.log('tear ' + v.id());
      // },
      // snap: function(v, e, u, i, depth){
      //   console.log('snap ' + v.id());
      // },
    });

    const pathToTarget = bfs.path.filter('node').intersection(targetNode).pathFrom(sourceNode);

    if (pathToTarget.length > 0) {
      dispatch(setFoundPath(pathToTarget.map((ele) => ele.id())));
    } else {
      dispatch(setFoundPath([]));
    }
  };

  const handleExportGraph = () => {
    const graphJson = {
      nodes: graphData.nodes,
      edges: graphData.edges,
    };
    const dataStr = JSON.stringify(graphJson, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intelgraph_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportGraph = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          if (importedData.nodes && importedData.edges) {
            dispatch(setGraphData({ nodes: importedData.nodes, edges: importedData.edges }));
          } else {
            dispatch(setErrorMessage('Invalid graph data format.'));
          }
        } catch (error) {
          dispatch(setErrorMessage('Error parsing JSON file.'));
          console.error('Error importing graph:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="h6">IntelGraph Visualization</Typography>
        <Button
          onClick={() => handleLayoutChange('cose-bilkent')}
          variant="contained"
          sx={{ mr: 1 }}
        >
          Cose Bilkent Layout
        </Button>
        <Button onClick={() => handleLayoutChange('dagre')} variant="contained" sx={{ mr: 1 }}>
          Dagre Layout
        </Button>
        <Button onClick={() => handleLayoutChange('cola')} variant="contained" sx={{ mr: 1 }}>
          Cola Layout
        </Button>
        <Button onClick={animateMessageBox} variant="contained" sx={{ mr: 1 }}>
          Toggle Message Box (jQuery)
        </Button>
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
        <Button onClick={handleAddNode} variant="contained" sx={{ ml: 2 }}>
          Add Node
        </Button>
        <Button
          onClick={handleDeleteSelected}
          variant="contained"
          color="error"
          sx={{ ml: 1 }}
          disabled={!graphData.selectedNode && !graphData.selectedEdge}
        >
          Delete Selected
        </Button>
        <Button onClick={handleZoomToFit} variant="contained" sx={{ ml: 1 }}>
          Zoom to Fit
        </Button>
        <Button
          onClick={handleZoomToSelection}
          variant="contained"
          sx={{ ml: 1 }}
          disabled={!graphData.selectedNode && !graphData.selectedEdge}
        >
          Zoom to Selection
        </Button>
        <Button onClick={handleExportGraph} variant="contained" sx={{ ml: 1 }}>
          Export Graph
        </Button>
        <input
          accept=".json"
          style={{ display: 'none' }}
          id="import-graph-file"
          type="file"
          onChange={handleImportGraph}
        />
        <label htmlFor="import-graph-file">
          <Button variant="contained" component="span" sx={{ ml: 1 }}>
            Import Graph
          </Button>
        </label>
      </Box>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="subtitle1">Feature Toggles:</Typography>
        {Object.entries(graphData.featureToggles).map(([key, value]) => (
          <FormControlLabel
            key={key}
            control={<Switch checked={value} onChange={handleToggleFeature(key)} name={key} />}
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
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="subtitle1">Graph Statistics:</Typography>
        <Typography variant="body2">Nodes: {graphData.graphStats.numNodes}</Typography>
        <Typography variant="body2">Edges: {graphData.graphStats.numEdges}</Typography>
        <Typography variant="body2">Density: {graphData.graphStats.density}</Typography>
      </Box>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="subtitle1">Pathfinding:</Typography>
        <TextField
          select
          label="Source Node"
          value={graphData.pathSourceNode || ''}
          onChange={(e) => dispatch(setPathSourceNode(e.target.value))}
          size="small"
          sx={{ mr: 1, width: '150px' }}
        >
          {graphData.nodes.map((node) => (
            <MenuItem key={node.data.id} value={node.data.id}>
              {node.data.label || node.data.id}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Target Node"
          value={graphData.pathTargetNode || ''}
          onChange={(e) => dispatch(setPathTargetNode(e.target.value))}
          size="small"
          sx={{ mr: 1, width: '150px' }}
        >
          {graphData.nodes.map((node) => (
            <MenuItem key={node.data.id} value={node.data.id}>
              {node.data.label || node.data.id}
            </MenuItem>
          ))}
        </TextField>
        <Button
          onClick={handleFindPath}
          variant="contained"
          sx={{ mr: 1 }}
          disabled={!graphData.pathSourceNode || !graphData.pathTargetNode}
        >
          Find Path
        </Button>
        {graphData.foundPath.length > 0 && (
          <Typography variant="body2">Path Found: {graphData.foundPath.join(' -> ')}</Typography>
        )}
        {graphData.foundPath.length === 0 &&
          graphData.pathSourceNode &&
          graphData.pathTargetNode && <Typography variant="body2">No Path Found</Typography>}
      </Box>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="subtitle1">Filters:</Typography>
        <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
          <InputLabel id="node-type-filter-label">Node Type</InputLabel>
          <Select
            labelId="node-type-filter-label"
            id="node-type-filter"
            multiple
            value={graphData.nodeTypeFilter}
            onChange={(e) => dispatch(setNodeTypeFilter(e.target.value))}
            input={<OutlinedInput label="Node Type" />}
            renderValue={(selected) => selected.join(', ')}
          >
            {[...new Set(graphData.nodes.map((node) => node.data.type))].map((type) => (
              <MenuItem key={type} value={type}>
                <Checkbox checked={graphData.nodeTypeFilter.indexOf(type) > -1} />
                <ListItemText primary={type} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" gutterBottom>
          Min Confidence: {graphData.minConfidenceFilter.toFixed(2)}
        </Typography>
        <Slider
          value={graphData.minConfidenceFilter}
          onChange={(e, newValue) => dispatch(setMinConfidenceFilter(newValue))}
          aria-labelledby="min-confidence-slider"
          valueLabelDisplay="auto"
          min={0}
          max={1}
          step={0.1}
          sx={{ width: 200, ml: 1 }}
        />
      </Box>
      {graphData.selectedNode && (
        <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
          <Typography variant="subtitle1">Edit Node: {graphData.selectedNode}</Typography>
          <TextField
            label="Node Label"
            variant="outlined"
            size="small"
            value={
              graphData.nodes.find((n) => n.data.id === graphData.selectedNode)?.data.label || ''
            }
            onChange={(e) => handleUpdateNodeLabel(e.target.value)}
            sx={{ width: '200px' }}
          />
        </Box>
      )}
      {(graphData.selectedNode || graphData.selectedEdge) && (
        <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
          <Typography variant="subtitle1">Properties:</Typography>
          {graphData.selectedNode && (
            <Box>
              {Object.entries(
                graphData.nodes.find((n) => n.data.id === graphData.selectedNode)?.data || {},
              ).map(([key, value]) => (
                <Typography key={key} variant="body2">
                  <strong>{key}:</strong> {JSON.stringify(value)}
                </Typography>
              ))}
            </Box>
          )}
          {graphData.selectedEdge && (
            <Box>
              {Object.entries(
                graphData.edges.find((e) => e.data.id === graphData.selectedEdge)?.data || {},
              ).map(([key, value]) => (
                <Typography key={key} variant="body2">
                  <strong>{key}:</strong> {JSON.stringify(value)}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}
      <Box id="message-box" sx={{ p: 2, bgcolor: 'info.light', display: 'none' }}>
        <Typography>This is a message box animated with jQuery!</Typography>
      </Box>
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <Box id="cy" sx={{ flexGrow: 1, border: '1px solid #ddd' }}></Box>
        <RbacSidePanel />
      </Box>
      <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
        <Typography>Selected Node: {graphData.selectedNode || 'None'}</Typography>
        <Typography>Selected Edge: {graphData.selectedEdge || 'None'}</Typography>
      </Box>
      {graphData.isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <Snackbar
        open={!!graphData.errorMessage}
        autoHideDuration={6000}
        onClose={() => dispatch(setErrorMessage(null))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => dispatch(setErrorMessage(null))}
          severity="error"
          sx={{ width: '100%' }}
        >
          {graphData.errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
