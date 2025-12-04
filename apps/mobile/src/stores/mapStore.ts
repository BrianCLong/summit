import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type MapStyleType = 'satellite' | 'streets' | 'dark' | 'light';

interface MapState {
  // Map view state
  mapStyle: MapStyleType;
  center: { latitude: number; longitude: number };
  zoom: number;
  bearing: number;
  pitch: number;

  // Layer visibility
  visibleLayers: string[];
  layerOpacity: Record<string, number>;

  // Selection
  selectedFeatureId: string | null;
  selectedEntityId: string | null;

  // Filters
  entityTypeFilter: string[];
  priorityFilter: string[];
  classificationFilter: string[];
  timeRange: { start: Date | null; end: Date | null };

  // UI state
  isLayerPanelOpen: boolean;
  isFilterPanelOpen: boolean;

  // Actions
  setMapStyle: (style: MapStyleType) => void;
  setCenter: (center: { latitude: number; longitude: number }) => void;
  setZoom: (zoom: number) => void;
  setBearing: (bearing: number) => void;
  setPitch: (pitch: number) => void;
  toggleLayer: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setSelectedFeature: (featureId: string | null) => void;
  setSelectedEntity: (entityId: string | null) => void;
  setEntityTypeFilter: (types: string[]) => void;
  setPriorityFilter: (priorities: string[]) => void;
  setClassificationFilter: (classifications: string[]) => void;
  setTimeRange: (range: { start: Date | null; end: Date | null }) => void;
  toggleLayerPanel: () => void;
  toggleFilterPanel: () => void;
  resetFilters: () => void;
}

export const useMapStore = create<MapState>()(
  immer((set) => ({
    // Initial state
    mapStyle: 'dark',
    center: { latitude: 38.8977, longitude: -77.0365 },
    zoom: 10,
    bearing: 0,
    pitch: 0,
    visibleLayers: ['entities', 'alerts'],
    layerOpacity: {},
    selectedFeatureId: null,
    selectedEntityId: null,
    entityTypeFilter: [],
    priorityFilter: [],
    classificationFilter: [],
    timeRange: { start: null, end: null },
    isLayerPanelOpen: false,
    isFilterPanelOpen: false,

    // Actions
    setMapStyle: (style) =>
      set((state) => {
        state.mapStyle = style;
      }),

    setCenter: (center) =>
      set((state) => {
        state.center = center;
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = zoom;
      }),

    setBearing: (bearing) =>
      set((state) => {
        state.bearing = bearing;
      }),

    setPitch: (pitch) =>
      set((state) => {
        state.pitch = pitch;
      }),

    toggleLayer: (layerId) =>
      set((state) => {
        const index = state.visibleLayers.indexOf(layerId);
        if (index === -1) {
          state.visibleLayers.push(layerId);
        } else {
          state.visibleLayers.splice(index, 1);
        }
      }),

    setLayerOpacity: (layerId, opacity) =>
      set((state) => {
        state.layerOpacity[layerId] = opacity;
      }),

    setSelectedFeature: (featureId) =>
      set((state) => {
        state.selectedFeatureId = featureId;
      }),

    setSelectedEntity: (entityId) =>
      set((state) => {
        state.selectedEntityId = entityId;
      }),

    setEntityTypeFilter: (types) =>
      set((state) => {
        state.entityTypeFilter = types;
      }),

    setPriorityFilter: (priorities) =>
      set((state) => {
        state.priorityFilter = priorities;
      }),

    setClassificationFilter: (classifications) =>
      set((state) => {
        state.classificationFilter = classifications;
      }),

    setTimeRange: (range) =>
      set((state) => {
        state.timeRange = range;
      }),

    toggleLayerPanel: () =>
      set((state) => {
        state.isLayerPanelOpen = !state.isLayerPanelOpen;
      }),

    toggleFilterPanel: () =>
      set((state) => {
        state.isFilterPanelOpen = !state.isFilterPanelOpen;
      }),

    resetFilters: () =>
      set((state) => {
        state.entityTypeFilter = [];
        state.priorityFilter = [];
        state.classificationFilter = [];
        state.timeRange = { start: null, end: null };
      }),
  })),
);
