import { z } from 'zod';
import { Location, CrisisType, SeverityLevel } from '@intelgraph/crisis-detection';

// Map and Visualization Types
export enum LayerType {
  INCIDENT = 'INCIDENT',
  ASSET = 'ASSET',
  PERSONNEL = 'PERSONNEL',
  WEATHER = 'WEATHER',
  TRAFFIC = 'TRAFFIC',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  HAZARD = 'HAZARD',
  BOUNDARY = 'BOUNDARY',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  VIDEO_FEED = 'VIDEO_FEED',
}

export enum AssetType {
  VEHICLE = 'VEHICLE',
  AIRCRAFT = 'AIRCRAFT',
  BOAT = 'BOAT',
  EQUIPMENT = 'EQUIPMENT',
  FACILITY = 'FACILITY',
  SHELTER = 'SHELTER',
  HOSPITAL = 'HOSPITAL',
  FIRE_STATION = 'FIRE_STATION',
  POLICE_STATION = 'POLICE_STATION',
  COMMAND_POST = 'COMMAND_POST',
}

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  DEPLOYED = 'DEPLOYED',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  DAMAGED = 'DAMAGED',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export enum PersonnelStatus {
  AVAILABLE = 'AVAILABLE',
  DEPLOYED = 'DEPLOYED',
  ON_SCENE = 'ON_SCENE',
  IN_TRANSIT = 'IN_TRANSIT',
  OFF_DUTY = 'OFF_DUTY',
  INJURED = 'INJURED',
}

export enum InfrastructureStatus {
  OPERATIONAL = 'OPERATIONAL',
  DEGRADED = 'DEGRADED',
  DAMAGED = 'DAMAGED',
  DESTROYED = 'DESTROYED',
  UNKNOWN = 'UNKNOWN',
}

// Schemas
export const MapLayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(LayerType),
  visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  zIndex: z.number(),
  data: z.any(),
  style: z.record(z.any()).optional(),
  updateInterval: z.number().positive().optional(),
});

export const IncidentMarkerSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  crisisType: z.nativeEnum(CrisisType),
  severity: z.nativeEnum(SeverityLevel),
  title: z.string(),
  status: z.string(),
  timestamp: z.date(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const AssetMarkerSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    altitude: z.number().optional(),
  }),
  type: z.nativeEnum(AssetType),
  status: z.nativeEnum(AssetStatus),
  name: z.string(),
  lastUpdate: z.date(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export const PersonnelMarkerSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  name: z.string(),
  role: z.string(),
  status: z.nativeEnum(PersonnelStatus),
  team: z.string().optional(),
  lastUpdate: z.date(),
  contact: z.string().optional(),
});

export const InfrastructureMarkerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  status: z.nativeEnum(InfrastructureStatus),
  capacity: z.number().optional(),
  currentLoad: z.number().optional(),
  lastInspection: z.date().optional(),
  criticalityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

export const WeatherOverlaySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['RADAR', 'SATELLITE', 'TEMPERATURE', 'WIND', 'PRECIPITATION']),
  timestamp: z.date(),
  data: z.any(),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number(),
  }),
});

export const TrafficDataSchema = z.object({
  id: z.string().uuid(),
  segmentId: z.string(),
  coordinates: z.array(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
    })
  ),
  flowSpeed: z.number(),
  congestionLevel: z.enum(['FREE_FLOW', 'MODERATE', 'HEAVY', 'STOPPED']),
  incidents: z.array(z.string()).optional(),
  timestamp: z.date(),
});

export const VideoFeedSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  streamUrl: z.string().url(),
  type: z.enum(['CCTV', 'DRONE', 'BODY_CAM', 'HELICOPTER', 'FIXED']),
  status: z.enum(['LIVE', 'OFFLINE', 'RECORDING']),
  direction: z.number().optional(),
  zoom: z.number().optional(),
});

export const TimelineEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.nativeEnum(SeverityLevel),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  relatedIncidentId: z.string().uuid().optional(),
  source: z.string(),
  metadata: z.record(z.any()).optional(),
});

export const CommonOperatingPictureSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  incidentId: z.string().uuid(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  layers: z.array(MapLayerSchema),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number(),
  }),
  center: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  zoom: z.number(),
  timeline: z.array(TimelineEventSchema),
  activeUsers: z.array(z.string()),
});

// Types derived from schemas
export type MapLayer = z.infer<typeof MapLayerSchema>;
export type IncidentMarker = z.infer<typeof IncidentMarkerSchema>;
export type AssetMarker = z.infer<typeof AssetMarkerSchema>;
export type PersonnelMarker = z.infer<typeof PersonnelMarkerSchema>;
export type InfrastructureMarker = z.infer<typeof InfrastructureMarkerSchema>;
export type WeatherOverlay = z.infer<typeof WeatherOverlaySchema>;
export type TrafficData = z.infer<typeof TrafficDataSchema>;
export type VideoFeed = z.infer<typeof VideoFeedSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type CommonOperatingPicture = z.infer<typeof CommonOperatingPictureSchema>;

// Interfaces
export interface MapDataProvider {
  fetchData(): Promise<any>;
  subscribe(callback: (data: any) => void): () => void;
}

export interface LayerRenderer {
  render(layer: MapLayer, container: any): void;
  update(data: any): void;
  destroy(): void;
}

export interface SpatialAnalyzer {
  calculateDistance(point1: Location, point2: Location): number;
  findNearbyAssets(location: Location, radius: number): AssetMarker[];
  findNearbyPersonnel(location: Location, radius: number): PersonnelMarker[];
  isWithinBounds(location: Location, bounds: any): boolean;
}
