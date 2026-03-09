/**
 * Summit War Room — Narrative Builder
 *
 * Construct intelligence narratives from timeline events.
 * Supports drag-and-drop event ordering and narrative text editing.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { useWarRoomStore } from '../store';

export const NarrativeBuilder: React.FC = () => {
  const events = useWarRoomStore((s) => s.timelineEvents);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [narrativeText, setNarrativeText] = useState('');
  const [title, setTitle] = useState('');

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const toggleEvent = (id: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedEvents = sortedEvents.filter((e) => selectedEventIds.has(e.id));

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Event picker */}
      <Box sx={{ width: 280, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Events</Typography>
          <Typography variant="caption" color="text.secondary">
            Select events to include in the narrative
          </Typography>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List dense disablePadding>
            {sortedEvents.map((event) => (
              <ListItem key={event.id} disablePadding sx={{ py: 0.25 }}>
                <Checkbox
                  size="small"
                  checked={selectedEventIds.has(event.id)}
                  onChange={() => toggleEvent(event.id)}
                  sx={{ p: 0.5 }}
                />
                <ListItemText
                  primary={event.title}
                  secondary={new Date(event.timestamp).toLocaleDateString()}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>

      {/* Narrative editor */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Narrative title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ mb: 1, '& .MuiInputBase-input': { fontSize: 16, fontWeight: 600 } }}
        />

        {selectedEvents.length > 0 && (
          <Box sx={{ mb: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {selectedEvents.map((e) => (
              <Chip
                key={e.id}
                label={`${e.title} (${new Date(e.timestamp).toLocaleDateString()})`}
                size="small"
                onDelete={() => toggleEvent(e.id)}
                sx={{ fontSize: 10 }}
              />
            ))}
          </Box>
        )}

        <Divider sx={{ mb: 1 }} />

        <TextField
          multiline
          fullWidth
          minRows={8}
          placeholder="Write your intelligence narrative here. Reference selected events to build a coherent storyline..."
          value={narrativeText}
          onChange={(e) => setNarrativeText(e.target.value)}
          sx={{ flex: 1, '& .MuiInputBase-root': { alignItems: 'flex-start' }, '& .MuiInputBase-input': { fontSize: 13 } }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1 }}>
          <Button size="small" variant="outlined">
            Save Draft
          </Button>
          <Button size="small" variant="contained">
            Publish
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
