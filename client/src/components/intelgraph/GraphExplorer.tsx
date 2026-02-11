import React, { useRef, useEffect, useState } from 'react';
import cytoscape from 'cytoscape';
import { Box, Paper, Typography, IconButton, CircularProgress, Alert } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong, ErrorOutline } from '@mui/icons-material';

interface NodeData {
  id: string;
  label: string;
  type: string;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  label: string;
}

export const GraphExplorer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cy, setCy] = useState<cytoscape.Core | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataCount, setDataCount] = useState({ nodes: 0, edges: 0 });

  useEffect(() => {
    // Simulate data fetch
    const timer = setTimeout(() => {
      if (containerRef.current && !cy) {
        try {
          const elements = [
            { data: { id: 'a', label: 'Entity A', type: 'Person' } },
            { data: { id: 'b', label: 'Entity B', type: 'Org' } },
            { data: { id: 'ab', source: 'a', target: 'b', label: 'WORKS_FOR' } }
          ];

          const instance = cytoscape({
            container: containerRef.current,
            style: [
              {
                selector: 'node',
                style: {
                  'background-color': '#2196f3',
                  'label': 'data(label)',
                  'text-valign': 'center',
                  'color': '#fff',
                  'font-size': '10px',
                  'width': 30,
                  'height': 30
                }
              },
              {
                selector: 'edge',
                style: {
                  'width': 2,
                  'line-color': '#ccc',
                  'target-arrow-color': '#ccc',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier',
                  'label': 'data(label)',
                  'font-size': '8px'
                }
              }
            ],
            elements: elements,
            layout: { name: 'grid' }
          });

          instance.on('tap', 'node', (evt) => {
            console.log('Tapped node', evt.target.id());
          });

          setCy(instance);
          setDataCount({ nodes: 2, edges: 1 });
          setLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to initialize graph');
          setLoading(false);
        }
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (cy) {
        cy.destroy();
        setCy(null);
      }
    };
  }, []); // Only run once on mount

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">IntelGraph Explorer (Phase 2)</Typography>
        {!loading && !error && (
          <Typography variant="caption" color="textSecondary">
            Nodes: {dataCount.nodes} | Edges: {dataCount.edges}
          </Typography>
        )}
      </Box>

      <Paper sx={{ flexGrow: 1, position: 'relative', m: 2, overflow: 'hidden', bgcolor: '#fafafa' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {loading && (
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.7)', zIndex: 10
          }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography>Initializing IntelGraph Engine...</Typography>
          </Box>
        )}

        {error && (
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            p: 4, textAlign: 'center'
          }}>
            <ErrorOutline color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6" color="error">Visualization Error</Typography>
            <Typography color="textSecondary">{error}</Typography>
          </Box>
        )}

        {!loading && !error && dataCount.nodes === 0 && (
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            p: 4, textAlign: 'center'
          }}>
            <Typography variant="h6">No Graph Data Found</Typography>
            <Typography color="textSecondary">Ingest data to begin exploration</Typography>
          </Box>
        )}

        {cy && !loading && (
          <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Tooltip title="Zoom In" placement="left">
              <IconButton size="small" onClick={() => cy.zoom(cy.zoom() * 1.2)} sx={{ bgcolor: 'white', border: '1px solid #ddd' }}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out" placement="left">
              <IconButton size="small" onClick={() => cy.zoom(cy.zoom() / 1.2)} sx={{ bgcolor: 'white', border: '1px solid #ddd' }}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="Fit to View" placement="left">
              <IconButton size="small" onClick={() => cy.fit()} sx={{ bgcolor: 'white', border: '1px solid #ddd' }}>
                <CenterFocusStrong />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
