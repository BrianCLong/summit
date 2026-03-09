/**
 * Summit War Room — Context Panel
 *
 * Right-side panel showing contextual details for the selected
 * entity, evidence item, or event.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useWarRoomStore } from './store';

export const WarRoomContextPanel: React.FC = () => {
  const contextPanelOpen = useWarRoomStore((s) => s.contextPanelOpen);
  const toggleContextPanel = useWarRoomStore((s) => s.toggleContextPanel);
  const selectedEntityId = useWarRoomStore((s) => s.selectedEntityId);
  const entities = useWarRoomStore((s) => s.entities);
  const relationships = useWarRoomStore((s) => s.relationships);
  const evidence = useWarRoomStore((s) => s.evidence);

  if (!contextPanelOpen) return null;

  const entity = entities.find((e) => e.id === selectedEntityId);
  const relatedRels = relationships.filter(
    (r) => r.source === selectedEntityId || r.target === selectedEntityId,
  );
  const relatedEvidence = evidence.filter((e) => e.linkedEntities.includes(selectedEntityId ?? ''));

  return (
    <Box
      sx={{
        width: 320,
        flexShrink: 0,
        borderLeft: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Context
        </Typography>
        <IconButton size="small" onClick={toggleContextPanel}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1 }}>
        {!entity && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Select an entity on the graph to view details.
          </Typography>
        )}

        {entity && (
          <>
            {/* Entity header */}
            <Typography variant="h4" sx={{ mt: 1, mb: 0.5 }}>
              {entity.label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={entity.type} size="small" color="primary" />
              <Chip label={entity.confidence} size="small" variant="outlined" />
            </Box>

            {/* Properties */}
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Properties
            </Typography>
            <List dense disablePadding>
              {Object.entries(entity.properties).map(([key, val]) => (
                <ListItem key={key} disablePadding sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={key}
                    secondary={String(val)}
                    primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    secondaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 1 }} />

            {/* Relationships */}
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Relationships ({relatedRels.length})
            </Typography>
            <List dense disablePadding>
              {relatedRels.slice(0, 20).map((rel) => {
                const otherId = rel.source === selectedEntityId ? rel.target : rel.source;
                const other = entities.find((e) => e.id === otherId);
                return (
                  <ListItem key={rel.id} disablePadding sx={{ py: 0.25 }}>
                    <ListItemText
                      primary={`${rel.type} → ${other?.label ?? otherId}`}
                      secondary={`weight: ${rel.weight} | confidence: ${rel.confidence}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                );
              })}
            </List>

            <Divider sx={{ my: 1 }} />

            {/* Evidence */}
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Evidence ({relatedEvidence.length})
            </Typography>
            <List dense disablePadding>
              {relatedEvidence.slice(0, 10).map((ev) => (
                <ListItem key={ev.id} disablePadding sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={ev.title}
                    secondary={`${ev.type} | reliability: ${ev.reliability}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>
    </Box>
  );
};
