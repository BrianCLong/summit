/**
 * Summit War Room — Temporal Map
 *
 * Time-based heatmap showing event density across time periods.
 */

import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { useWarRoomStore } from '../store';

export const TemporalMap: React.FC = () => {
  const events = useWarRoomStore((s) => s.timelineEvents);

  // Group events by date
  const dateGroups = useMemo(() => {
    const groups = new Map<string, number>();
    events.forEach((e) => {
      const date = new Date(e.timestamp).toISOString().slice(0, 10);
      groups.set(date, (groups.get(date) ?? 0) + 1);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [events]);

  const maxCount = Math.max(1, ...dateGroups.map((g) => g.count));

  return (
    <Box sx={{ p: 1.5 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Temporal Event Map
      </Typography>

      {dateGroups.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No timeline events to display.
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
        {dateGroups.map(({ date, count }) => (
          <Tooltip key={date} title={`${date}: ${count} events`}>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: 0.5,
                bgcolor: 'primary.main',
                opacity: 0.2 + (count / maxCount) * 0.8,
                cursor: 'pointer',
              }}
            />
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
};
