import { z } from 'zod';

export const GeoPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  value: z.number().optional(),
  label: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const GeoRegionSchema = z.object({
  id: z.string(),
  name: z.string(),
  geometry: z.unknown(), // GeoJSON geometry
  value: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type GeoRegion = z.infer<typeof GeoRegionSchema>;

export const TrajectoryPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.union([z.date(), z.string(), z.number()]),
  metadata: z.record(z.unknown()).optional(),
});

export type TrajectoryPoint = z.infer<typeof TrajectoryPointSchema>;

export const TrajectorySchema = z.object({
  id: z.string(),
  points: z.array(TrajectoryPointSchema),
  color: z.string().optional(),
  label: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Trajectory = z.infer<typeof TrajectorySchema>;

export const MapLayerSchema = z.object({
  id: z.string(),
  type: z.enum(['points', 'heatmap', 'choropleth', 'trajectory', 'cluster', 'polygon']),
  data: z.unknown(),
  visible: z.boolean().default(true),
  opacity: z.number().default(1),
  zIndex: z.number().optional(),
});

export type MapLayer = z.infer<typeof MapLayerSchema>;

export const MapConfigSchema = z.object({
  center: z.tuple([z.number(), z.number()]).default([0, 0]),
  zoom: z.number().default(2),
  minZoom: z.number().default(1),
  maxZoom: z.number().default(18),
  baseLayer: z.enum(['streets', 'satellite', 'terrain', 'dark', 'light']).default('streets'),
  showControls: z.boolean().default(true),
  showScale: z.boolean().default(true),
  showAttribution: z.boolean().default(true),
});

export type MapConfig = z.infer<typeof MapConfigSchema>;

export const HeatmapConfigSchema = z.object({
  radius: z.number().default(25),
  blur: z.number().default(15),
  maxZoom: z.number().default(17),
  max: z.number().default(1),
  gradient: z.record(z.string()).optional(),
});

export type HeatmapConfig = z.infer<typeof HeatmapConfigSchema>;

export const ClusterConfigSchema = z.object({
  radius: z.number().default(80),
  maxZoom: z.number().default(14),
  showCoverageOnHover: z.boolean().default(true),
  spiderfyOnMaxZoom: z.boolean().default(true),
});

export type ClusterConfig = z.infer<typeof ClusterConfigSchema>;

export interface MapEventHandlers {
  onMapClick?: (latlng: { lat: number; lng: number }, event: L.LeafletMouseEvent) => void;
  onMarkerClick?: (point: GeoPoint, event: L.LeafletMouseEvent) => void;
  onRegionClick?: (region: GeoRegion, event: L.LeafletMouseEvent) => void;
  onViewportChange?: (bounds: L.LatLngBounds, zoom: number) => void;
}
