import React from 'react';
import type { PanelState, WarRoomPanelId } from './types';

interface WarRoomSidebarProps {
  panels: PanelState[];
  onTogglePanel: (panelId: WarRoomPanelId) => void;
}

export function WarRoomSidebar({ panels, onTogglePanel }: WarRoomSidebarProps) {
  return (
    <aside className="warroom-sidebar">
      <h3>Panels</h3>
      <ul>
        {panels.map((panel) => (
          <li key={panel.id}>
            <label>
              <input
                type="checkbox"
                checked={panel.visible}
                onChange={() => onTogglePanel(panel.id)}
              />
              {panel.title}
            </label>
          </li>
        ))}
      </ul>
    </aside>
  );
}
