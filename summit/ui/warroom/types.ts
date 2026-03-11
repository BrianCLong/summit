export type WarRoomPanelId =
  | 'graph'
  | 'timeline'
  | 'entityInspector'
  | 'evidence'
  | 'queryConsole'
  | 'agentConsole'
  | 'simulation'
  | 'activityFeed';

export interface PanelState {
  id: WarRoomPanelId;
  title: string;
  dock: 'left' | 'center' | 'right' | 'bottom';
  width: number;
  height: number;
  visible: boolean;
}

export interface WorkspaceLayout {
  id: string;
  name: string;
  panels: PanelState[];
  updatedAt: string;
}

export const DEFAULT_LAYOUT: WorkspaceLayout = {
  id: 'default-war-room-layout',
  name: 'Default War Room',
  updatedAt: new Date(0).toISOString(),
  panels: [
    { id: 'graph', title: 'Graph Panel', dock: 'center', width: 60, height: 60, visible: true },
    { id: 'timeline', title: 'Timeline Panel', dock: 'bottom', width: 60, height: 40, visible: true },
    { id: 'entityInspector', title: 'Entity Inspector', dock: 'right', width: 20, height: 50, visible: true },
    { id: 'evidence', title: 'Evidence Panel', dock: 'right', width: 20, height: 50, visible: true },
    { id: 'queryConsole', title: 'Query Console', dock: 'left', width: 20, height: 34, visible: true },
    { id: 'agentConsole', title: 'Agent Console', dock: 'left', width: 20, height: 33, visible: true },
    { id: 'simulation', title: 'Simulation Panel', dock: 'left', width: 20, height: 33, visible: true },
    { id: 'activityFeed', title: 'Activity Feed', dock: 'bottom', width: 40, height: 40, visible: true },
  ],
};
