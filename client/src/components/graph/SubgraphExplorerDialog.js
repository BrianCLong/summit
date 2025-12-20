import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import cytoscape from 'cytoscape';

export default function SubgraphExplorerDialog({ open, onClose, elements }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#888',
            label: 'data(label)',
            'font-size': 10,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': '#bbb',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#bbb',
            label: 'data(label)',
            'font-size': 8,
          },
        },
      ],
      layout: { name: 'cose' },
      boxSelectionEnabled: true,
    });
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [open, elements]);

  const handleClose = () => {
    if (cyRef.current) {
      const nodes = cyRef.current.nodes().map((n) => ({
        id: n.id(),
        position: n.position(),
        data: { ...n.data() },
      }));
      const edges = cyRef.current
        .edges()
        .map((e) => ({ id: e.id(), data: { ...e.data() } }));
      document.dispatchEvent(
        new CustomEvent('graph:syncSubgraph', { detail: { nodes, edges } }),
      );
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullScreen>
      <DialogTitle>Subgraph Explorer</DialogTitle>
      <DialogContent>
        <div ref={containerRef} style={{ width: '100%', height: '80vh' }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Return</Button>
      </DialogActions>
    </Dialog>
  );
}
