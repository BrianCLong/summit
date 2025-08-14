import React, { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import { useDispatch } from 'react-redux';
import { graphInteractionActions as g } from '../../store/slices/graphInteractionSlice';
import { Box, CircularProgress, FormControlLabel, Switch, Select, MenuItem, Tooltip } from '@mui/material';
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
  const [layoutName, setLayoutName] = useState(layout);
  const tooltipRef = useRef(null);

  const addElementsChunked = useMemo(() => {
    const ric = window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 16 }), 0));
    return (cy, nodes = [], edges = [], chunk = 2000) => {
      let i = 0, j = 0;
      function step() {
        const nSlice = nodes.slice(i, i + chunk);
        const eSlice = edges.slice(j, j + chunk);
        cy.startBatch();
        nSlice.forEach((n) => { if (!cy.getElementById(n.id).nonempty()) cy.add({ group: 'nodes', data: n }); });
        eSlice.forEach((e) => { if (!cy.getElementById(e.id).nonempty()) cy.add({ group: 'edges', data: e }); });
        cy.endBatch();
        i += chunk; j += chunk;
        if (i < nodes.length || j < edges.length) ric(step);
      }
      ric(step);
    };
  }, []);

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
    addElementsChunked(cy, elements.nodes, elements.edges);

    const runLayout = () => {
      const cfg = layoutName === 'dagre'
        ? { name: 'dagre', rankDir: 'LR' }
        : layoutName === 'grid'
        ? { name: 'grid', fit: true }
        : layoutName === 'concentric'
        ? { name: 'concentric', minNodeSpacing: 15 }
        : { name: 'cose-bilkent', randomize: true, animate: false };
      cy.layout(cfg).run();
    };
    runLayout();

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

    // Keyboard shortcuts
    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        cy.boxSelectionEnabled(false);
        cy.panningEnabled(true);
      } else if (e.code === 'Escape') {
        cy.elements().unselect();
        dispatch(g.clearSelection());
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        cy.boxSelectionEnabled(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Focus animation on selection
    cy.on('select', 'node,edge', (evt) => {
      const ele = evt.target;
      const pos = ele.position();
      cy.animate({ center: { eles: ele }, zoom: Math.max(0.6, cy.zoom()), duration: 250 }, { queue: true });
    });

    // Throttled hover tooltip
    const tooltip = document.createElement('div');
    tooltip.style.position = 'fixed';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.background = 'rgba(0,0,0,0.75)';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '2px 6px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '11px';
    tooltip.style.zIndex = '9999';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    tooltipRef.current = tooltip;

    let lastShow = 0;
    const showTooltip = (text, x, y) => {
      const now = performance.now();
      if (now - lastShow < 50) return; // throttle ~20fps
      lastShow = now;
      tooltip.textContent = text;
      tooltip.style.left = `${x + 12}px`;
      tooltip.style.top = `${y + 12}px`;
      tooltip.style.display = 'block';
    };
    const hideTooltip = () => { tooltip.style.display = 'none'; };

    cy.on('mouseover', 'node,edge', (evt) => {
      const text = evt.target.data('label') || evt.target.id();
      const px = evt.renderedPosition;
      const rect = containerRef.current.getBoundingClientRect();
      const x = rect.left + px.x; const y = rect.top + px.y;
      showTooltip(text, x, y);
    });
    cy.on('mouseout', 'node,edge', hideTooltip);

    // Listen for element additions from context menu
    const onAddElements = (ev) => {
      const { nodes = [], edges = [] } = ev.detail || {};
      addElementsChunked(cy, nodes, edges);
    };
    document.addEventListener('graph:addElements', onAddElements);
    return () => {
      document.removeEventListener('graph:addElements', onAddElements);
      if (tooltipRef.current) { tooltipRef.current.remove(); tooltipRef.current = null; }
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cy.destroy();
      cyRef.current = null;
    };
  }, [dispatch, elements, layout, lodLabels]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <CircularProgress />
        </Box>
      )}

      <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />

      <Box sx={{ position: 'absolute', top: 8, left: 8, p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
        <FormControlLabel control={<Switch checked={insightsOpen} onChange={(e) => setInsightsOpen(e.target.checked)} />} label="AI Panel" />
        <FormControlLabel control={<Switch checked={lodLabels} onChange={(e) => setLodLabels(e.target.checked)} />} label="LOD Labels" />
        <Select size="small" value={layoutName} onChange={(e) => setLayoutName(e.target.value)}>
          <MenuItem value="cose-bilkent">CoSE</MenuItem>
          <MenuItem value="dagre">Dagre</MenuItem>
          <MenuItem value="grid">Grid</MenuItem>
          <MenuItem value="concentric">Concentric</MenuItem>
        </Select>
      </Box>

      <GraphContextMenu />
      <AIInsightsPanel open={insightsOpen} onClose={() => setInsightsOpen(false)} />
    </Box>
  );
}
