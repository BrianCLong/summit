import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Drawer,
  Typography,
  FormControlLabel,
  Switch,
  Divider,
  Button,
  Stack
} from '@mui/material';
import $ from 'jquery';
import {
  toggleHighlight,
  togglePopovers,
  setPanelOpen
} from '../../store/slices/aiInsightsSlice';

export default function AIInsightsPanel({ open, onClose }) {
  const dispatch = useDispatch();
  const { highlight, popovers } = useSelector(s => s.aiInsights);
  const { nodes, edges } = useSelector(s => s.graph);
  const panelRef = useRef(null);

  useEffect(() => {
    dispatch(setPanelOpen(open));
  }, [open, dispatch]);

  useEffect(() => {
    const $panel = $(panelRef.current);
    if (open) {
      $panel.stop(true, true).hide().fadeIn(300);
    } else {
      $panel.stop(true, true).fadeOut(300);
    }
  }, [open]);

  const exportData = format => {
    const data = {
      nodes: nodes.map(n => n.data || n),
      edges: edges.map(e => e.data || e)
    };

    let blob;
    let filename;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      filename = 'ai-insights.json';
    } else {
      const csvRows = ['id,label,community'];
      data.nodes.forEach(n => {
        csvRows.push(`${n.id},${n.label || ''},${n.community || ''}`);
      });
      blob = new Blob([csvRows.join('\n')], {
        type: 'text/csv'
      });
      filename = 'ai-insights.csv';
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 300 } }}
    >
      <Box ref={panelRef} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          AI Insights
        </Typography>
        <FormControlLabel
          control={<Switch checked={highlight} onChange={() => dispatch(toggleHighlight())} />}
          label="Highlight Communities"
        />
        <FormControlLabel
          control={<Switch checked={popovers} onChange={() => dispatch(togglePopovers())} />}
          label="Metadata Popovers"
        />
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => exportData('csv')} aria-label="Export CSV">
            Export CSV
          </Button>
          <Button variant="contained" onClick={() => exportData('json')} aria-label="Export JSON">
            Export JSON
          </Button>
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
      </Box>
    </Drawer>
  );
}
