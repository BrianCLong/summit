/**
 * Summit War Room — Source Inspector
 *
 * Displays source metadata and reliability assessment.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import type { Source, ProvenanceRecord } from '../types';

interface SourceInspectorProps {
  source?: Source | null;
  provenance: ProvenanceRecord[];
}

export const SourceInspector: React.FC<SourceInspectorProps> = ({ source, provenance }) => (
  <Box>
    {/* Source details */}
    <Typography variant="h6" sx={{ mb: 0.5 }}>
      Source
    </Typography>
    {source ? (
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="body2" fontWeight={600}>
          {source.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
          <Chip label={source.type} size="small" sx={{ fontSize: 10 }} />
          <Chip label={`Reliability: ${source.reliability}`} size="small" variant="outlined" sx={{ fontSize: 10 }} />
        </Box>
        {source.url && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {source.url}
          </Typography>
        )}
        {source.lastAccessed && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Last accessed: {new Date(source.lastAccessed).toLocaleString()}
          </Typography>
        )}
      </Box>
    ) : (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Unknown source
      </Typography>
    )}

    {/* Provenance chain */}
    <Divider sx={{ mb: 1 }} />
    <Typography variant="h6" sx={{ mb: 0.5 }}>
      Provenance Chain ({provenance.length})
    </Typography>
    {provenance.length === 0 && (
      <Typography variant="body2" color="text.secondary">
        No provenance records.
      </Typography>
    )}
    <List dense disablePadding>
      {provenance.map((record) => (
        <ListItem key={record.id} disablePadding sx={{ py: 0.25 }}>
          <ListItemText
            primary={`${record.action} by ${record.actor}`}
            secondary={`${new Date(record.timestamp).toLocaleString()} — ${record.details}`}
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItem>
      ))}
    </List>
  </Box>
);
