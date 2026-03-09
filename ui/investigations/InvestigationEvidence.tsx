/**
 * Summit War Room — Investigation Evidence
 *
 * Evidence items linked to the active investigation.
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

export const InvestigationEvidence: React.FC = () => {
  const activeInvestigation = useWarRoomStore((s) => s.activeInvestigation);
  const evidence = useWarRoomStore((s) => s.evidence);

  if (!activeInvestigation) return null;

  const investigationEvidence = evidence.filter((e) => activeInvestigation.evidenceIds.includes(e.id));

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Evidence ({investigationEvidence.length})
        </Typography>
        <Button size="small" startIcon={<AddIcon />}>
          Attach Evidence
        </Button>
      </Box>

      {investigationEvidence.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No evidence attached. Browse evidence in the Evidence panel and attach to this investigation.
        </Typography>
      )}

      <List dense disablePadding>
        {investigationEvidence.map((ev) => (
          <ListItemButton key={ev.id} sx={{ borderRadius: 1, mb: 0.5 }}>
            <ListItemText
              primary={ev.title}
              secondary={`${ev.type} | reliability: ${ev.reliability} | ${ev.provenance.length} provenance records`}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
            <Chip label={ev.reliability} size="small" sx={{ fontSize: 10 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};
