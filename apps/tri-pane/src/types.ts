export type LayerId = 'signals' | 'comms' | 'logistics';

export interface GraphNode {
  id: string;
  label: string;
  layer: LayerId;
  timestamp: number;
  location: string;
  confidence: number;
  provenance: string;
  neighbors: string[];
  geofence: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  strength: number;
}

export interface TimelineEvent {
  id: string;
  label: string;
  timestamp: number;
  weight: number;
  annotation: string;
}

export interface Geofence {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface ViewSnapshot {
  name: string;
  timeRange: TimeRange;
  pinnedNodes: string[];
  activeLayers: LayerId[];
  geofence: string | null;
  filterText: string;
  focusNodeId?: string;
}

export interface TriPaneState extends ViewSnapshot {
  savedViews: ViewSnapshot[];
}

export type TriPaneAction =
  | { type: 'setTimeRange'; payload: TimeRange }
  | { type: 'toggleLayer'; payload: LayerId }
  | { type: 'setGeofence'; payload: string | null }
  | { type: 'togglePin'; payload: string }
  | { type: 'setFilterText'; payload: string }
  | { type: 'setFocusNode'; payload: string | undefined }
  | { type: 'saveView'; payload: string }
  | { type: 'loadView'; payload: string }
  | { type: 'replaceViews'; payload: ViewSnapshot[] };
