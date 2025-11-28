/**
 * Mobile Field Ops Type Definitions
 */

// User and Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  avatarUrl?: string;
}

export type UserRole = 'field_agent' | 'analyst' | 'supervisor' | 'admin';

export interface DeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  model?: string;
  osVersion?: string;
  appVersion: string;
  registeredAt: string;
  lastActiveAt: string;
}

export interface AuthState {
  user: User | null;
  deviceInfo: DeviceInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isPinVerified: boolean;
  sessionExpiresAt: number | null;
}

// Case and Alert types
export interface Case {
  id: string;
  title: string;
  status: CaseStatus;
  priority: Priority;
  assignedTo: string[];
  summary?: string;
  lastUpdated: string;
  createdAt: string;
  entityCount: number;
  alertCount: number;
  keyEntities?: EntitySummary[];
  mapSnapshot?: MapSnapshot;
  lastBrief?: Brief;
}

export type CaseStatus = 'open' | 'in_progress' | 'pending_review' | 'closed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: Severity;
  caseId?: string;
  entityId?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
}

export type AlertType =
  | 'new_intelligence'
  | 'entity_update'
  | 'relationship_change'
  | 'assignment'
  | 'deadline'
  | 'system';

export type Severity = 'info' | 'warning' | 'error' | 'critical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  caseId: string;
  assignedTo: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

// Entity types
export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  attributes: Record<string, unknown>;
  photos?: EntityPhoto[];
  provenance?: ProvenanceSummary;
  lastUpdated: string;
  createdAt: string;
  confidence?: number;
}

export interface EntitySummary {
  id: string;
  type: EntityType;
  name: string;
  thumbnailUrl?: string;
}

export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'event'
  | 'document'
  | 'vehicle'
  | 'device'
  | 'account'
  | 'other';

export interface EntityPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ProvenanceSummary {
  sources: string[];
  confidence: number;
  lastVerified?: string;
  chain: ProvenanceLink[];
}

export interface ProvenanceLink {
  source: string;
  timestamp: string;
  method: string;
}

// Map types
export interface MapSnapshot {
  centerLat: number;
  centerLng: number;
  zoom: number;
  markers: MapMarker[];
  thumbnailUrl?: string;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'entity' | 'event' | 'poi';
  label?: string;
}

// Brief types
export interface Brief {
  id: string;
  caseId: string;
  title: string;
  content: string;
  summary: string;
  createdAt: string;
  createdBy: string;
}

// Note and Observation types
export interface Note {
  id: string;
  localId: string; // For offline sync
  entityId?: string;
  caseId?: string;
  alertId?: string;
  content: string;
  createdAt: string;
  createdBy: string;
  syncStatus: SyncStatus;
  version: number;
}

export interface Observation {
  id: string;
  localId: string;
  caseId: string;
  type: ObservationType;
  data: Record<string, unknown>;
  location?: GeoLocation;
  timestamp: string;
  createdBy: string;
  syncStatus: SyncStatus;
  version: number;
}

export type ObservationType =
  | 'sighting'
  | 'contact'
  | 'activity'
  | 'incident'
  | 'other';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
}

// Attachment types
export interface Attachment {
  id: string;
  localId: string;
  type: AttachmentType;
  filename: string;
  mimeType: string;
  size: number;
  localUri?: string; // Local file path for offline
  remoteUrl?: string;
  caseId?: string;
  entityId?: string;
  uploadedAt?: string;
  uploadedBy: string;
  syncStatus: SyncStatus;
}

export type AttachmentType = 'photo' | 'audio' | 'document';

// Sync types
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: 'note' | 'observation' | 'attachment' | 'acknowledgement';
  data: unknown;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}

export interface ConflictResolution {
  id: string;
  localData: unknown;
  serverData: unknown;
  resolvedData: unknown;
  resolvedAt: string;
  resolution: 'local' | 'server' | 'merge';
}

// Network and offline types
export type NetworkStatus = 'online' | 'offline' | 'slow';

export interface CacheMetadata {
  key: string;
  type: string;
  cachedAt: string;
  expiresAt: string;
  size: number;
  checksum: string;
}

// Security types
export interface SecurityConfig {
  requirePin: boolean;
  requireBiometric: boolean;
  sessionTimeoutMinutes: number;
  maxFailedAttempts: number;
  enableScreenshotPrevention: boolean;
  enableCopyPrevention: boolean;
}

export interface DeviceToken {
  token: string;
  deviceId: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
  revokedAt?: string;
}
