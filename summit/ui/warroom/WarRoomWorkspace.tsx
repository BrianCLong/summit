import React, { useMemo, useState } from 'react';
import { ActivityStream } from './ActivityStream';
import { WarRoomCanvas } from './WarRoomCanvas';
import { WarRoomCommandPalette } from './WarRoomCommandPalette';
import { WarRoomContextPanel } from './WarRoomContextPanel';
import { WarRoomSidebar } from './WarRoomSidebar';
import { WarRoomToolbar } from './WarRoomToolbar';
import { AgentConsole } from './agents/AgentConsole';
import { EvidencePanel } from './evidence/EvidencePanel';
import { GraphCanvas } from './graph/GraphCanvas';
import { TimelineCanvas } from './timeline/TimelineCanvas';
import type { WorkspaceLayout, WarRoomPanelId } from './types';
import { DEFAULT_LAYOUT } from './types';

const STORAGE_KEY = 'summit-war-room-layout';

function loadStoredLayout(): WorkspaceLayout {
  if (typeof window === 'undefined') {
    return DEFAULT_LAYOUT;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceLayout) : DEFAULT_LAYOUT;
  } catch (error) {
    console.error('Failed to load saved War Room layout. Falling back to default layout.', error);
    return DEFAULT_LAYOUT;
  }
}

export function WarRoomWorkspace() {
  const [layout, setLayout] = useState<WorkspaceLayout>(() => loadStoredLayout());
  const [theme, setTheme] = useState<'dark-intelligence' | 'light-analysis'>('dark-intelligence');

  const onTogglePanel = (panelId: WarRoomPanelId) => {
    setLayout((previous) => ({
      ...previous,
      panels: previous.panels.map((panel) =>
        panel.id === panelId ? { ...panel, visible: !panel.visible } : panel,
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const onSaveLayout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    }
  };

  const panelViews = useMemo<Record<string, React.ReactNode>>(
    () => ({
      graph: <GraphCanvas />,
      timeline: <TimelineCanvas />,
      entityInspector: <WarRoomContextPanel selectedEntity="ENTITY-4401" activeCaseId="CASE-2026-017" />,
      evidence: <EvidencePanel />,
      queryConsole: <WarRoomCommandPalette />,
      agentConsole: <AgentConsole />,
      simulation: <div>Simulation command center placeholder.</div>,
      activityFeed: <ActivityStream />,
    }),
    [],
  );

  return (
    <div className={`warroom-workspace theme-${theme}`}>
      <WarRoomToolbar
        layout={layout}
        onSaveLayout={onSaveLayout}
        onToggleTheme={() =>
          setTheme((current) =>
            current === 'dark-intelligence' ? 'light-analysis' : 'dark-intelligence',
          )
        }
      />
      <div className="warroom-layout">
        <WarRoomSidebar panels={layout.panels} onTogglePanel={onTogglePanel} />
        <WarRoomCanvas panels={layout.panels} children={panelViews} />
      </div>
    </div>
  );
}
