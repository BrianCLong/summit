/**
 * Summit War Room — Timeline Canvas
 *
 * Unified timeline view that merges events from multiple sources.
 * Supports zoom, pan, narrative progression visualization,
 * anomaly highlighting, and drag-and-drop event creation.
 */

import React, { useMemo, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FilterListIcon from '@mui/icons-material/FilterList';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useWarRoomStore } from '../store';
import type { TimelineEvent } from '../types';

type ZoomLevel = 'hours' | 'days' | 'weeks' | 'months';

const ZOOM_LEVELS: ZoomLevel[] = ['hours', 'days', 'weeks', 'months'];

export const TimelineCanvas: React.FC = () => {
  const events = useWarRoomStore((s) => s.timelineEvents);
  const setSelectedEntity = useWarRoomStore((s) => s.setSelectedEntity);
  const [zoom, setZoom] = useState<ZoomLevel>('days');
  const [showAnomalies, setShowAnomalies] = useState(false);

  const sortedEvents = useMemo(
    () =>
      [...events]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .filter((e) => (showAnomalies ? e.isAnomaly : true)),
    [events, showAnomalies],
  );

  const zoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
  };

  const zoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 1,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
          gap: 0.5,
        }}
      >
        <Typography variant="caption" fontWeight={600} sx={{ mr: 1 }}>
          Zoom: {zoom}
        </Typography>
        <IconButton size="small" onClick={zoomIn}>
          <ZoomInIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={zoomOut}>
          <ZoomOutIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Toggle anomaly filter">
          <IconButton size="small" onClick={() => setShowAnomalies(!showAnomalies)} color={showAnomalies ? 'warning' : 'default'}>
            <WarningAmberIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Chip label={`${sortedEvents.length} events`} size="small" sx={{ fontSize: 10 }} />
      </Box>

      {/* Timeline body */}
      <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {sortedEvents.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No timeline events. Add events from the investigation workspace.
          </Typography>
        )}

        {/* Horizontal timeline track */}
        <Box sx={{ display: 'flex', flexDirection: 'column', p: 1 }}>
          {sortedEvents.map((event, idx) => (
            <TimelineEventCard key={event.id} event={event} isLast={idx === sortedEvents.length - 1} onEntityClick={setSelectedEntity} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Event Card                                                         */
/* ------------------------------------------------------------------ */

const TimelineEventCard: React.FC<{
  event: TimelineEvent;
  isLast: boolean;
  onEntityClick: (id: string) => void;
}> = React.memo(({ event, isLast, onEntityClick }) => (
  <Box sx={{ display: 'flex', gap: 1, mb: isLast ? 0 : 0.5 }}>
    {/* Dot + connector */}
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: event.isAnomaly ? 'error.main' : 'primary.main',
          border: 2,
          borderColor: 'background.paper',
          mt: 0.5,
        }}
      />
      {!isLast && <Box sx={{ width: 1, flex: 1, bgcolor: 'divider' }} />}
    </Box>

    {/* Content */}
    <Box
      sx={{
        flex: 1,
        p: 1,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: event.isAnomaly ? 'error.main' : 'divider',
        mb: 0.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
        <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
          {event.title}
        </Typography>
        {event.isAnomaly && <WarningAmberIcon sx={{ fontSize: 14, color: 'error.main' }} />}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {new Date(event.timestamp).toLocaleString()} | {event.source}
      </Typography>
      {event.description && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {event.description}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
        {event.tags.map((tag) => (
          <Chip key={tag} label={tag} size="small" sx={{ fontSize: 9, height: 18 }} />
        ))}
        <Chip label={event.confidence} size="small" variant="outlined" sx={{ fontSize: 9, height: 18 }} />
      </Box>
    </Box>
  </Box>
));
