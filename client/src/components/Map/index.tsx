/**
 * IntelGraph Map Components
 * Geospatial visualization and analysis components
 */

export { MapContainer, useMap } from './MapContainer';
export { Marker, MarkerClusterLayer } from './layers/MarkerLayer';
export { HeatmapLayer } from './layers/HeatmapLayer';
export { GeoJSONLayer, ChoroplethLayer } from './layers/GeoJSONLayer';
export { LayerControl } from './controls/LayerControl';
export { GeospatialDashboard } from './GeospatialDashboard';

export type { MapContainerProps } from './MapContainer';
export type { MarkerProps, MarkerClusterLayerProps } from './layers/MarkerLayer';
export type { HeatmapLayerProps, HeatmapPoint } from './layers/HeatmapLayer';
export type { GeoJSONLayerProps, ChoroplethLayerProps } from './layers/GeoJSONLayer';
export type { LayerControlProps, LayerConfig } from './controls/LayerControl';
export type { GeospatialDashboardProps, DashboardData } from './GeospatialDashboard';
