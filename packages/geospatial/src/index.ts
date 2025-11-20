/**
 * @intelgraph/geospatial
 * Geospatial analysis and visualization utilities
 */

import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, Point } from 'geojson';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity?: number;
}

export interface GeospatialAnalysis {
  analyze(features: FeatureCollection): Promise<any>;
}

export interface MapConfig {
  center?: [number, number];
  zoom?: number;
  layers?: string[];
}

export * from 'geojson';
