// conductor-ui/frontend/src/components/HelpOverlay.tsx
import React from 'react';

export const HelpOverlay = () => {
  // Placeholder for the Help/Docs overlay (Ctrl/Cmd+/).
  return (
    <div style={{ display: 'none' }}>
      <h2>Help & Documentation</h2>
      <ul>
        <li>
          <b>Ctrl/Cmd+K</b>: Open Command Palette
        </li>
        <li>
          <b>Ctrl/Cmd+/</b>: Open Help
        </li>
      </ul>
    </div>
  );
};
