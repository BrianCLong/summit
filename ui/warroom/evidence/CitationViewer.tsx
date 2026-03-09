/**
 * Summit War Room — Citation Viewer
 *
 * Displays and verifies citations attached to evidence items.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useWarRoomStore } from '../store';

export const CitationViewer: React.FC = () => {
  const evidence = useWarRoomStore((s) => s.evidence);
  const sources = useWarRoomStore((s) => s.sources);

  // Build citation list from evidence-source relationships
  const citations = evidence
    .map((ev) => {
      const source = sources.find((s) => s.id === ev.sourceId);
      return { evidence: ev, source };
    })
    .filter((c) => c.source);

  return (
    <Box sx={{ p: 1.5 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Citations ({citations.length})
      </Typography>

      {citations.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No citations to display.
        </Typography>
      )}

      <List dense disablePadding>
        {citations.map(({ evidence: ev, source }) => (
          <ListItem key={ev.id} sx={{ borderBottom: 1, borderColor: 'divider', py: 0.75 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <LinkIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={ev.title}
              secondary={
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip label={source!.name} size="small" sx={{ fontSize: 9, height: 18 }} />
                  <Chip label={`Reliability: ${source!.reliability}`} size="small" variant="outlined" sx={{ fontSize: 9, height: 18 }} />
                  {source!.url && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                      {source!.url}
                    </Typography>
                  )}
                </Box>
              }
              primaryTypographyProps={{ variant: 'body2' }}
            />
            {/* Verification status */}
            {source!.reliability <= 'B' ? (
              <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
            ) : (
              <ErrorIcon color="warning" sx={{ fontSize: 16 }} />
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
