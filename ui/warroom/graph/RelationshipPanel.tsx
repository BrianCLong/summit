/**
 * Summit War Room — Relationship Panel
 *
 * Inspects the selected relationship: type, properties,
 * confidence, and connected entities.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useWarRoomStore } from '../store';

export const RelationshipPanel: React.FC = () => {
  const selectedRelationshipId = useWarRoomStore((s) => s.selectedRelationshipId);
  const relationships = useWarRoomStore((s) => s.relationships);
  const entities = useWarRoomStore((s) => s.entities);

  const rel = relationships.find((r) => r.id === selectedRelationshipId);

  if (!rel) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Select a relationship on the graph to inspect.
        </Typography>
      </Box>
    );
  }

  const source = entities.find((e) => e.id === rel.source);
  const target = entities.find((e) => e.id === rel.target);

  return (
    <Box sx={{ p: 1.5 }}>
      {/* Relationship header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Chip label={source?.label ?? rel.source} size="small" color="primary" />
        <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Chip label={rel.type} size="small" variant="outlined" />
        <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Chip label={target?.label ?? rel.target} size="small" color="primary" />
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
        <Chip label={`confidence: ${rel.confidence}`} size="small" variant="outlined" />
        <Chip label={`weight: ${rel.weight}`} size="small" variant="outlined" />
      </Box>

      {/* Properties */}
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Properties
      </Typography>
      <List dense disablePadding>
        {Object.entries(rel.properties).map(([key, val]) => (
          <ListItem key={key} disablePadding sx={{ py: 0.25 }}>
            <ListItemText
              primary={key}
              secondary={String(val)}
              primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
              secondaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
        ))}
        {Object.keys(rel.properties).length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No additional properties
          </Typography>
        )}
      </List>
    </Box>
  );
};
