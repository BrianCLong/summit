import React from 'react';
import type { WorkspaceLayout } from './types';

interface WarRoomToolbarProps {
  layout: WorkspaceLayout;
  onSaveLayout: () => void;
  onToggleTheme: () => void;
}

export function WarRoomToolbar({ layout, onSaveLayout, onToggleTheme }: WarRoomToolbarProps) {
  return (
    <header className="warroom-toolbar">
      <strong>Summit War Room</strong>
      <span>{layout.name}</span>
      <button onClick={onSaveLayout}>Save Layout</button>
      <button onClick={onToggleTheme}>Toggle Theme</button>
    </header>
  );
}
