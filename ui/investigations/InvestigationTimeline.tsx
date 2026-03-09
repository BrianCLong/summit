/**
 * Summit War Room — Investigation Timeline
 *
 * Timeline view scoped to the active investigation.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { useWarRoomStore } from '../warroom/store';
import { TimelineCanvas } from '../warroom/timeline/TimelineCanvas';

export const InvestigationTimeline: React.FC = () => {
  const activeInvestigation = useWarRoomStore((s) => s.activeInvestigation);
  const timelineEvents = useWarRoomStore((s) => s.timelineEvents);

  if (!activeInvestigation) return null;

  const investigationEvents = timelineEvents.filter((e) =>
    e.entityIds.some((id) => activeInvestigation.entities.includes(id)),
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Investigation Timeline ({investigationEvents.length} events)
        </Typography>
        <Button size="small" startIcon={<AddIcon />}>
          Add Event
        </Button>
      </Box>
      <Box sx={{ flex: 1 }}>
        <TimelineCanvas />
      </Box>
    </Box>
  );
};
