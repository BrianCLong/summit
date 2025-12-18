import { z } from 'zod';

// Classification levels
export const ClassificationLevel = z.enum([
  'UNCLASSIFIED',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET',
]);
export type ClassificationLevel = z.infer<typeof ClassificationLevel>;

// Priority levels
export const Priority = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
export type Priority = z.infer<typeof Priority>;

// Entity types
export const EntityType = z.enum([
  'PERSON',
  'ORGANIZATION',
  'LOCATION',
  'EVENT',
  'DOCUMENT',
  'THREAT',
  'VEHICLE',
  'DEVICE',
  'FINANCIAL',
  'COMMUNICATION',
]);
export type EntityType = z.infer<typeof EntityType>;

// Relationship types
export const RelationshipType = z.enum([
  'ASSOCIATED_WITH',
  'WORKS_FOR',
  'LOCATED_AT',
  'OWNS',
  'COMMUNICATES_WITH',
  'RELATED_TO',
  'PART_OF',
  'FUNDED_BY',
  'TRANSACTED_WITH',
  'MENTIONED_IN',
]);
export type RelationshipType = z.infer<typeof RelationshipType>;

// Base entity schema
export const EntitySchema = z.object({
  id: z.string().uuid(),
  type: EntityType,
  name: z.string(),
  description: z.string().optional(),
  classification: ClassificationLevel,
  priority: Priority.optional(),
  confidence: z.number().min(0).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
});
export type Entity = z.infer<typeof EntitySchema>;

// Relationship schema
export const RelationshipSchema = z.object({
  id: z.string().uuid(),
  type: RelationshipType,
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  classification: ClassificationLevel,
  confidence: z.number().min(0).max(100),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});
export type Relationship = z.infer<typeof RelationshipSchema>;

// Investigation schema
export const InvestigationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  classification: ClassificationLevel,
  priority: Priority,
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'CLOSED', 'ARCHIVED']),
  leadAnalyst: z.string(),
  team: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  entityCount: z.number().default(0),
  relationshipCount: z.number().default(0),
});
export type Investigation = z.infer<typeof InvestigationSchema>;

// OSINT Alert schema
export const OSINTAlertSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  priority: Priority,
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  entities: z.array(z.string().uuid()),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      name: z.string().optional(),
    })
    .optional(),
  timestamp: z.string().datetime(),
  isRead: z.boolean().default(false),
  isAcknowledged: z.boolean().default(false),
  acknowledgedAt: z.string().datetime().optional(),
  acknowledgedBy: z.string().optional(),
});
export type OSINTAlert = z.infer<typeof OSINTAlertSchema>;

// GEOINT Feature schema
export const GEOINTFeatureSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('Feature'),
  geometry: z.object({
    type: z.enum(['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon']),
    coordinates: z.union([
      z.tuple([z.number(), z.number()]),
      z.array(z.tuple([z.number(), z.number()])),
      z.array(z.array(z.tuple([z.number(), z.number()]))),
    ]),
  }),
  properties: z.object({
    name: z.string().optional(),
    entityId: z.string().uuid().optional(),
    entityType: EntityType.optional(),
    classification: ClassificationLevel.optional(),
    priority: Priority.optional(),
    description: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    source: z.string().optional(),
    confidence: z.number().min(0).max(100).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});
export type GEOINTFeature = z.infer<typeof GEOINTFeatureSchema>;

// GEOINT Layer schema
export const GEOINTLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['entities', 'alerts', 'heatmap', 'routes', 'areas', 'custom']),
  visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  features: z.array(GEOINTFeatureSchema),
  style: z.record(z.unknown()).optional(),
});
export type GEOINTLayer = z.infer<typeof GEOINTLayerSchema>;

// Sync status types
export interface SyncStatus {
  lastSyncAt: string | null;
  pendingChanges: number;
  isSyncing: boolean;
  error: string | null;
  offlineMode: boolean;
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  mapStyle: 'satellite' | 'streets' | 'dark' | 'light';
  notifications: {
    alerts: boolean;
    updates: boolean;
    mentions: boolean;
    sound: boolean;
    vibration: boolean;
  };
  offlineSettings: {
    autoSync: boolean;
    syncOnWifiOnly: boolean;
    maxOfflineData: number; // MB
  };
  displaySettings: {
    showConfidence: boolean;
    showClassification: boolean;
    compactMode: boolean;
  };
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  EntityDetails: { entityId: string };
  InvestigationDetails: { investigationId: string };
  AlertDetails: { alertId: string };
  MapFullScreen: { layerIds?: string[]; centerOn?: { lat: number; lng: number } };
  Settings: undefined;
  Profile: undefined;
  Search: { query?: string };
  Notifications: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  MFA: { userId: string };
  Biometric: undefined;
  PINSetup: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Investigations: undefined;
  Map: undefined;
  Alerts: undefined;
  More: undefined;
};

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
