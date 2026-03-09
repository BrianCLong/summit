/**
 * Summit War Room — Presence & Collaboration Overlay
 *
 * Renders collaborator cursors and presence indicators
 * across the War Room workspace.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useWarRoomStore } from './store';

export const WarRoomPresence: React.FC = () => {
  const collaborators = useWarRoomStore((s) => s.collaborators);
  const active = collaborators.filter((c) => c.cursor);

  if (active.length === 0) return null;

  return (
    <>
      {active.map((c) => (
        <Box
          key={c.id}
          sx={{
            position: 'fixed',
            left: c.cursor!.x,
            top: c.cursor!.y,
            pointerEvents: 'none',
            zIndex: 9999,
            transition: 'all 80ms ease-out',
          }}
        >
          {/* Cursor arrow */}
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
            <path d="M0 0L16 12L6 12L0 20V0Z" fill={c.color} />
          </svg>
          {/* Name badge */}
          <Box
            sx={{
              position: 'absolute',
              top: 18,
              left: 8,
              bgcolor: c.color,
              color: '#fff',
              px: 0.75,
              py: 0.25,
              borderRadius: 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600 }}>
              {c.name}
            </Typography>
          </Box>
        </Box>
      ))}
    </>
  );
};
