/**
 * Summit War Room — Event Fusion View
 *
 * Merges and deduplicates timeline events from multiple intelligence
 * sources, showing corroboration and conflicts.
 */

import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import { useWarRoomStore } from '../store';
import type { TimelineEvent } from '../types';

interface FusedGroup {
  key: string;
  events: TimelineEvent[];
  corroborationScore: number;
}

export const EventFusionView: React.FC = () => {
  const events = useWarRoomStore((s) => s.timelineEvents);

  // Group events by proximity (within 1 hour) and shared entities
  const fusedGroups = useMemo<FusedGroup[]>(() => {
    if (events.length === 0) return [];

    const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const groups: FusedGroup[] = [];
    const used = new Set<string>();

    sorted.forEach((event) => {
      if (used.has(event.id)) return;

      const nearby = sorted.filter((other) => {
        if (used.has(other.id) || other.id === event.id) return false;
        const diff = Math.abs(new Date(event.timestamp).getTime() - new Date(other.timestamp).getTime());
        const sharedEntities = event.entityIds.some((id) => other.entityIds.includes(id));
        return diff < 3600000 && sharedEntities; // within 1 hour + shared entities
      });

      const group: TimelineEvent[] = [event, ...nearby];
      group.forEach((e) => used.add(e.id));

      const uniqueSources = new Set(group.map((e) => e.source));
      groups.push({
        key: event.id,
        events: group,
        corroborationScore: Math.min(uniqueSources.size / 3, 1), // normalize to 0-1
      });
    });

    return groups;
  }, [events]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Event Fusion</Typography>
        <Typography variant="caption" color="text.secondary">
          {fusedGroups.length} fused event groups from {events.length} raw events
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {fusedGroups.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No events to fuse.
          </Typography>
        )}

        <List dense disablePadding>
          {fusedGroups.map((group) => (
            <ListItem key={group.key} sx={{ flexDirection: 'column', alignItems: 'stretch', borderBottom: 1, borderColor: 'divider', py: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                  {group.events[0].title}
                </Typography>
                <Chip
                  label={`${group.events.length} sources`}
                  size="small"
                  color={group.events.length > 1 ? 'success' : 'default'}
                  sx={{ fontSize: 10 }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Corroboration:
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={group.corroborationScore * 100}
                  sx={{ flex: 1, height: 4, borderRadius: 2 }}
                  color={group.corroborationScore > 0.5 ? 'success' : 'warning'}
                />
                <Typography variant="caption">{Math.round(group.corroborationScore * 100)}%</Typography>
              </Box>
              {group.events.length > 1 && (
                <Box sx={{ ml: 2 }}>
                  {group.events.map((ev) => (
                    <Typography key={ev.id} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {ev.source}: {new Date(ev.timestamp).toLocaleString()} ({ev.confidence})
                    </Typography>
                  ))}
                </Box>
              )}
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
};
