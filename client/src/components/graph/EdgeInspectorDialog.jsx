import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Divider, CircularProgress } from '@mui/material';
import { useLazyQuery } from '@apollo/client';
import { RELATIONSHIP_BY_ID } from '../../graphql/relationship.gql';

export default function EdgeInspectorDialog({ open, onClose, edge }) {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchMeta() {
      if (!open || !edge?.id) return;
      setLoading(true);
      try {
        if (import.meta?.env?.VITE_RELATIONSHIP_GQL === '1') {
          // Prefer GraphQL if enabled
          const res = await runQuery({ variables: { id: edge.id } });
          const data = res?.data?.relationship;
          if (!cancelled) setMeta(data || {});
        } else {
          const base = import.meta?.env?.VITE_API_URL || '';
          const res = await fetch(`${base}/dev/relationship/${edge.id}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!cancelled) setMeta(data);
        }
      } catch (e) {
        if (!cancelled) setMeta({ ...edge, error: e.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMeta();
    return () => { cancelled = true; };
  }, [open, edge]);

  const [runQuery] = useLazyQuery(RELATIONSHIP_BY_ID, { fetchPolicy: 'network-only' });

  if (!edge) return null;
  const merged = { ...edge, ...(meta || {}) };
  const { id, type, label, properties, source, target, error } = merged;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Relationship Inspector</DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">Loading…</Typography>
          </Box>
        )}
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>Failed to fetch metadata: {error}</Typography>
        )}
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
