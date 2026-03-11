import React from 'react';
import type { PanelState } from './types';

interface WarRoomCanvasProps {
  panels: PanelState[];
  children: Record<string, React.ReactNode>;
}

export function WarRoomCanvas({ panels, children }: WarRoomCanvasProps) {
  return (
    <main className="warroom-canvas">
      {panels
        .filter((panel) => panel.visible)
        .map((panel) => (
          <section key={panel.id} data-dock={panel.dock} className="warroom-panel">
            <header>{panel.title}</header>
            <div>{children[panel.id] ?? <em>Panel not configured.</em>}</div>
          </section>
        ))}
    </main>
  );
}
