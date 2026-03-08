"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMapStore = void 0;
const zustand_1 = require("zustand");
const immer_1 = require("zustand/middleware/immer");
exports.useMapStore = (0, zustand_1.create)()((0, immer_1.immer)((set) => ({
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
    setMapStyle: (style) => set((state) => {
        state.mapStyle = style;
    }),
    setCenter: (center) => set((state) => {
        state.center = center;
    }),
    setZoom: (zoom) => set((state) => {
        state.zoom = zoom;
    }),
    setBearing: (bearing) => set((state) => {
        state.bearing = bearing;
    }),
    setPitch: (pitch) => set((state) => {
        state.pitch = pitch;
    }),
    toggleLayer: (layerId) => set((state) => {
        const index = state.visibleLayers.indexOf(layerId);
        if (index === -1) {
            state.visibleLayers.push(layerId);
        }
        else {
            state.visibleLayers.splice(index, 1);
        }
    }),
    setLayerOpacity: (layerId, opacity) => set((state) => {
        state.layerOpacity[layerId] = opacity;
    }),
    setSelectedFeature: (featureId) => set((state) => {
        state.selectedFeatureId = featureId;
    }),
    setSelectedEntity: (entityId) => set((state) => {
        state.selectedEntityId = entityId;
    }),
    setEntityTypeFilter: (types) => set((state) => {
        state.entityTypeFilter = types;
    }),
    setPriorityFilter: (priorities) => set((state) => {
        state.priorityFilter = priorities;
    }),
    setClassificationFilter: (classifications) => set((state) => {
        state.classificationFilter = classifications;
    }),
    setTimeRange: (range) => set((state) => {
        state.timeRange = range;
    }),
    toggleLayerPanel: () => set((state) => {
        state.isLayerPanelOpen = !state.isLayerPanelOpen;
    }),
    toggleFilterPanel: () => set((state) => {
        state.isFilterPanelOpen = !state.isFilterPanelOpen;
    }),
    resetFilters: () => set((state) => {
        state.entityTypeFilter = [];
        state.priorityFilter = [];
        state.classificationFilter = [];
        state.timeRange = { start: null, end: null };
    }),
})));
