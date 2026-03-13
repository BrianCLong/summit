/**
 * Summit War Room — App Root
 *
 * Entry point for the War Room operational interface.
 * Wraps the workspace with theme and state providers.
 */

import React from 'react';
import { WarRoomThemeProvider } from './WarRoomThemeProvider';
import { WarRoomWorkspace } from './WarRoomWorkspace';

export const WarRoomApp: React.FC = () => (
  <WarRoomThemeProvider>
    <WarRoomWorkspace />
  </WarRoomThemeProvider>
);

export default WarRoomApp;
