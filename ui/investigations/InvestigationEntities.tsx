/**
 * Summit War Room — Investigation Entities
 *
 * Entity management for the active investigation.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { useWarRoomStore } from '../warroom/store';

export const InvestigationEntities: React.FC = () => {
  const activeInvestigation = useWarRoomStore((s) => s.activeInvestigation);
  const entities = useWarRoomStore((s) => s.entities);
  const setSelectedEntity = useWarRoomStore((s) => s.setSelectedEntity);

  if (!activeInvestigation) return null;

  const investigationEntities = entities.filter((e) => activeInvestigation.entities.includes(e.id));

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Linked Entities ({investigationEntities.length})
        </Typography>
        <Button size="small" startIcon={<AddIcon />}>
          Link Entity
        </Button>
      </Box>

      {investigationEntities.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No entities linked to this investigation. Use the graph canvas to find and link entities.
        </Typography>
      )}

      <List dense disablePadding>
        {investigationEntities.map((entity) => (
          <ListItemButton key={entity.id} onClick={() => setSelectedEntity(entity.id)} sx={{ borderRadius: 1, mb: 0.5 }}>
            <ListItemText
              primary={entity.label}
              secondary={`${entity.type} | confidence: ${entity.confidence} | ${entity.sources.length} sources`}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
            <Chip label={entity.type} size="small" sx={{ fontSize: 10 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};
