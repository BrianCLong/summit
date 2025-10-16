// conductor-ui/frontend/src/components/CommandPalette.tsx
import React from 'react';

export const CommandPalette = () => {
  // Placeholder for the command palette (Ctrl/Cmd+K).
  // Will include typeahead search for runs, incidents, etc.
  return (
    <div style={{ display: 'none' }}>
      <h2>Command Palette</h2>
      <input type="text" placeholder="Search for runs, incidents, tenants..." />
    </div>
  );
};
