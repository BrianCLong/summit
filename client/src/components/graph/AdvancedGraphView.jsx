import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import { useDispatch } from 'react-redux';
import { graphInteractionActions as g } from '../../store/slices/graphInteractionSlice';
import { Box, CircularProgress, FormControlLabel, Switch } from '@mui/material';
import GraphContextMenu from './GraphContextMenu';
import AIInsightsPanel from './AIInsightsPanel';

cytoscape.use(dagre);
cytoscape.use(coseBilkent);

const LABEL_ZOOM_THRESHOLD = 1.2;

export default function AdvancedGraphView({ elements = { nodes: [], edges: [] }, layout = 'cose-bilkent' }) {
  const dispatch = useDispatch();
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [lodLabels, setLodLabels] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        { selector: 'node', style: { 'background-color': '#888', label: 'data(label)', 'font-size': 10 } },
        { selector: 'edge', style: { width: 1, 'line-color': '#bbb', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#bbb', label: 'data(label)', 'font-size': 8 } },
      ],
      wheelSensitivity: 0.2,
      textureOnViewport: true,
      pixelRatio: 1,
      minZoom: 0.1,
      maxZoom: 5,
      boxSelectionEnabled: true,
    });

    cyRef.current = cy;

    setLoading(true);
    cy.startBatch();
    elements.nodes.forEach((n) => cy.add({ group: 'nodes', data: n }));
    elements.edges.forEach((e) => cy.add({ group: 'edges', data: e }));
    cy.endBatch();

    const layoutCfg = layout === 'dagre' ? { name: 'dagre', rankDir: 'LR' } : { name: 'cose-bilkent', randomize: true, animate: false };
    cy.layout(layoutCfg).run();

    const updateLabelsForLOD = () => {
      if (!lodLabels) return;
      const show = cy.zoom() >= LABEL_ZOOM_THRESHOLD;
      cy.batch(() => {
        cy.nodes().forEach((n) => n.style('label', show ? n.data('label') : ''));
        cy.edges().forEach((e) => e.style('label', show ? e.data('label') : ''));
      });
    };
    cy.on('zoom', updateLabelsForLOD);
    updateLabelsForLOD();

    cy.on('tap', 'node', (evt) => dispatch(g.selectNode(evt.target.id())));
    cy.on('tap', 'edge', (evt) => dispatch(g.selectEdge(evt.target.id())));
    cy.on('tap', (evt) => { if (evt.target === cy) dispatch(g.clearSelection()); });
    cy.on('cxttap', 'node, edge', (evt) => {
      const pos = evt.renderedPosition || evt.position;
      const pageX = evt.originalEvent?.pageX || pos.x;
      const pageY = evt.originalEvent?.pageY || pos.y;
      const targetType = evt.target.isNode() ? 'node' : 'edge';
      dispatch(g.contextMenuOpen({ x: pageX, y: pageY, targetType, targetId: evt.target.id() }));
    });

    setLoading(false);
    return () => { cy.destroy(); cyRef.current = null; };
  }, [dispatch, elements, layout, lodLabels]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <CircularProgress />
        </Box>
      )}

      <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />

      <Box sx={{ position: 'absolute', top: 8, left: 8, p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <FormControlLabel control={<Switch checked={insightsOpen} onChange={(e) => setInsightsOpen(e.target.checked)} />} label="AI Panel" />
        <FormControlLabel control={<Switch checked={lodLabels} onChange={(e) => setLodLabels(e.target.checked)} />} label="LOD Labels" />
      </Box>

      <GraphContextMenu />
      <AIInsightsPanel open={insightsOpen} onClose={() => setInsightsOpen(false)} />
    </Box>
  );
}

