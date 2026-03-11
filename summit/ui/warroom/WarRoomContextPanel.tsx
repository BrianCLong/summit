import React from 'react';

interface WarRoomContextPanelProps {
  selectedEntity?: string;
  activeCaseId?: string;
}

export function WarRoomContextPanel({ selectedEntity, activeCaseId }: WarRoomContextPanelProps) {
  return (
    <section className="warroom-context-panel">
      <h3>Operational Context</h3>
      <p>Case: {activeCaseId ?? 'No active case'}</p>
      <p>Entity: {selectedEntity ?? 'No entity selected'}</p>
      <p>Status: Real-time monitoring enabled</p>
    </section>
  );
}
