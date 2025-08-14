import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Divider } from '@mui/material';

export default function EdgeInspectorDialog({ open, onClose, edge }) {
  if (!edge) return null;
  const { id, type, label, properties, source, target } = edge;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Relationship Inspector</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 1, columnGap: 2 }}>
          <Typography variant="body2" color="text.secondary">ID</Typography>
          <Typography variant="body2">{id}</Typography>

          <Typography variant="body2" color="text.secondary">Type</Typography>
          <Typography variant="body2">{type || '—'}</Typography>

          <Typography variant="body2" color="text.secondary">Label</Typography>
          <Typography variant="body2">{label || '—'}</Typography>

          <Typography variant="body2" color="text.secondary">Source</Typography>
          <Typography variant="body2">{source?.label || source?.id}</Typography>

          <Typography variant="body2" color="text.secondary">Target</Typography>
          <Typography variant="body2">{target?.label || target?.id}</Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Properties</Typography>
        <Box component="pre" sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1, overflow: 'auto', maxHeight: 220 }}>
          {JSON.stringify(properties || {}, null, 2)}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

