/**
 * Summit War Room — Workspace
 *
 * Assembles the War Room layout: toolbar + sidebar + canvas + context panel.
 * Handles global keyboard shortcuts (Ctrl+K for command palette).
 */

import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import { WarRoomToolbar } from './WarRoomToolbar';
import { WarRoomSidebar } from './WarRoomSidebar';
import { WarRoomCanvas } from './WarRoomCanvas';
import { WarRoomContextPanel } from './WarRoomContextPanel';
import { WarRoomCommandPalette } from './WarRoomCommandPalette';
import { WarRoomPresence } from './WarRoomPresence';
import { useWarRoomStore } from './store';

export const WarRoomWorkspace: React.FC = () => {
  const toggleCommandPalette = useWarRoomStore((s) => s.toggleCommandPalette);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleCommandPalette]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <WarRoomToolbar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <WarRoomSidebar />
        <WarRoomCanvas />
        <WarRoomContextPanel />
      </Box>
      <WarRoomCommandPalette />
      <WarRoomPresence />
    </Box>
  );
};
