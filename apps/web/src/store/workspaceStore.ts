import { create } from 'zustand';

export interface Entity {
  id: string;
  type: string;
  label: string;
  lat?: number;
  lng?: number;
  timestamp?: string;
  description?: string;
}

export interface Link {
  source: string;
  target: string;
  value: number;
  type: string;
}

export interface WorkspaceState {
  selectedEntityIds: string[];
  timeRange: [Date, Date] | null;
  entities: Entity[];
  links: Link[];

  // Actions
  selectEntity: (id: string) => void;
  deselectEntity: (id: string) => void;
  clearSelection: () => void;
  setTimeRange: (range: [Date, Date] | null) => void;
  setGraphData: (entities: Entity[], links: Link[]) => void;
}

// Mock Data Generation
const generateMockData = () => {
  const entities: Entity[] = [
    { id: '1', type: 'Person', label: 'John Doe', lat: 40.7128, lng: -74.0060, timestamp: '2023-10-26T10:00:00Z', description: 'Suspect seen in NY' },
    { id: '2', type: 'Location', label: 'Central Park', lat: 40.7851, lng: -73.9683, timestamp: '2023-10-26T12:00:00Z', description: 'Meeting point' },
    { id: '3', type: 'Event', label: 'Transaction', lat: 40.7306, lng: -73.9352, timestamp: '2023-10-27T09:30:00Z', description: 'Large transfer observed' },
    { id: '4', type: 'Organization', label: 'Shell Corp', lat: 51.5074, lng: -0.1278, timestamp: '2023-10-25T15:45:00Z', description: 'Associated entity' },
    { id: '5', type: 'Person', label: 'Jane Smith', lat: 34.0522, lng: -118.2437, timestamp: '2023-10-28T14:20:00Z', description: 'Contact of John Doe' },
  ];

  const links: Link[] = [
    { source: '1', target: '2', value: 5, type: 'visited' },
    { source: '1', target: '3', value: 3, type: 'performed' },
    { source: '3', target: '4', value: 8, type: 'involved' },
    { source: '1', target: '5', value: 2, type: 'knows' },
  ];

  return { entities, links };
};

const { entities, links } = generateMockData();

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedEntityIds: [],
  timeRange: null,
  entities: entities,
  links: links,

  selectEntity: (id) => set((state) => ({
    selectedEntityIds: state.selectedEntityIds.includes(id)
      ? state.selectedEntityIds
      : [...state.selectedEntityIds, id]
  })),

  deselectEntity: (id) => set((state) => ({
    selectedEntityIds: state.selectedEntityIds.filter((eid) => eid !== id)
  })),

  clearSelection: () => set({ selectedEntityIds: [] }),

  setTimeRange: (range) => set({ timeRange: range }),

  setGraphData: (entities, links) => set({ entities, links }),
}));
