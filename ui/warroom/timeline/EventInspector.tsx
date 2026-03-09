/**
 * Summit War Room — Event Inspector
 *
 * Detailed view of a single timeline event with linked entities,
 * evidence, and source metadata.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useWarRoomStore } from '../store';
import type { TimelineEvent } from '../types';

interface EventInspectorProps {
  eventId?: string;
}

export const EventInspector: React.FC<EventInspectorProps> = ({ eventId }) => {
  const events = useWarRoomStore((s) => s.timelineEvents);
  const entities = useWarRoomStore((s) => s.entities);
  const evidence = useWarRoomStore((s) => s.evidence);
  const setSelectedEntity = useWarRoomStore((s) => s.setSelectedEntity);

  const event = events.find((e) => e.id === eventId);

  if (!event) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Select a timeline event to inspect.
        </Typography>
      </Box>
    );
  }

  const linkedEntities = entities.filter((e) => event.entityIds.includes(e.id));
  const linkedEvidence = evidence.filter((e) => e.linkedEntities.some((id) => event.entityIds.includes(id)));

  return (
    <Box sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {event.title}
        </Typography>
        {event.isAnomaly && <WarningAmberIcon color="error" />}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {new Date(event.timestamp).toLocaleString()}
        {event.endTimestamp && ` — ${new Date(event.endTimestamp).toLocaleString()}`}
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
        <Chip label={event.source} size="small" color="info" />
        <Chip label={event.confidence} size="small" variant="outlined" />
        {event.tags.map((tag) => (
          <Chip key={tag} label={tag} size="small" sx={{ fontSize: 10 }} />
        ))}
      </Box>

      <Typography variant="body2" sx={{ mb: 1.5 }}>
        {event.description}
      </Typography>

      <Divider sx={{ mb: 1 }} />

      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Linked Entities ({linkedEntities.length})
      </Typography>
      <List dense disablePadding>
        {linkedEntities.map((entity) => (
          <ListItemButton key={entity.id} onClick={() => setSelectedEntity(entity.id)} sx={{ py: 0.25, borderRadius: 1 }}>
            <ListItemText
              primary={entity.label}
              secondary={entity.type}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItemButton>
        ))}
      </List>

      {linkedEvidence.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Related Evidence ({linkedEvidence.length})
          </Typography>
          <List dense disablePadding>
            {linkedEvidence.map((ev) => (
              <ListItemButton key={ev.id} sx={{ py: 0.25, borderRadius: 1 }}>
                <ListItemText
                  primary={ev.title}
                  secondary={`${ev.type} | reliability: ${ev.reliability}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ))}
          </List>
        </>
      )}
    </Box>
  );
};
