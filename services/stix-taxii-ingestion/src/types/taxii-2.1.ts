/**
 * TAXII 2.1 Protocol Type Definitions
 * Complete types for TAXII 2.1 server communication
 */

import type { StixBundle, StixObject } from './stix-2.1.js';

// ============================================================================
// Discovery Resources
// ============================================================================

export interface TaxiiDiscovery {
  title: string;
  description?: string;
  contact?: string;
  default?: string;
  api_roots: string[];
}

export interface TaxiiApiRoot {
  title: string;
  description?: string;
  versions: string[];
  max_content_length: number;
}

// ============================================================================
// Collection Resources
// ============================================================================

export interface TaxiiCollection {
  id: string;
  title: string;
  description?: string;
  alias?: string;
  can_read: boolean;
  can_write: boolean;
  media_types?: string[];
}

export interface TaxiiCollectionsResponse {
  collections?: TaxiiCollection[];
}

// ============================================================================
// Object Resources
// ============================================================================

export interface TaxiiEnvelope {
  more?: boolean;
  next?: string;
  objects?: StixObject[];
}

export interface TaxiiManifest {
  more?: boolean;
  objects?: TaxiiManifestEntry[];
}

export interface TaxiiManifestEntry {
  id: string;
  date_added?: string;
  version?: string;
  media_type?: string;
}

export interface TaxiiVersions {
  more?: boolean;
  versions?: string[];
}

// ============================================================================
// Status Resource
// ============================================================================

export type TaxiiStatusState = 'pending' | 'complete';

export interface TaxiiStatus {
  id: string;
  status: TaxiiStatusState;
  request_timestamp?: string;
  total_count?: number;
  success_count?: number;
  successes?: TaxiiStatusDetail[];
  failure_count?: number;
  failures?: TaxiiStatusDetail[];
  pending_count?: number;
  pendings?: TaxiiStatusDetail[];
}

export interface TaxiiStatusDetail {
  id: string;
  version?: string;
  message?: string;
}

// ============================================================================
// Error Handling
// ============================================================================

export interface TaxiiError {
  title: string;
  description?: string;
  error_id?: string;
  error_code?: string;
  http_status?: number;
  external_details?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface TaxiiGetObjectsParams {
  added_after?: string;
  limit?: number;
  next?: string;
  match?: {
    id?: string | string[];
    type?: string | string[];
    version?: string;
    spec_version?: string | string[];
  };
}

export interface TaxiiAddObjectsRequest {
  objects: StixObject[];
}

export interface TaxiiAddObjectsResponse extends TaxiiStatus {}

// ============================================================================
// Client Configuration Types
// ============================================================================

export interface TaxiiClientConfig {
  /** Base URL of the TAXII server */
  serverUrl: string;

  /** API root path (optional, will be discovered if not provided) */
  apiRoot?: string;

  /** Authentication configuration */
  auth?: TaxiiAuthConfig;

  /** Proxy configuration for air-gapped environments */
  proxy?: TaxiiProxyConfig;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Custom headers to include in requests */
  headers?: Record<string, string>;

  /** Maximum number of objects to fetch per request */
  pageSize?: number;

  /** Whether to verify SSL certificates */
  verifySsl?: boolean;

  /** Retry configuration */
  retry?: TaxiiRetryConfig;
}

export interface TaxiiAuthConfig {
  type: 'basic' | 'bearer' | 'api-key' | 'certificate';
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  certificate?: {
    cert: string | Buffer;
    key: string | Buffer;
    ca?: string | Buffer;
    passphrase?: string;
  };
}

export interface TaxiiProxyConfig {
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

export interface TaxiiRetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
}

// ============================================================================
// Feed Configuration Types
// ============================================================================

export interface TaxiiFeedConfig {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  serverUrl: string;
  apiRoot?: string;
  collectionId?: string;
  auth?: TaxiiAuthConfig;
  proxy?: TaxiiProxyConfig;
  syncIntervalSeconds: number;
  lastSync?: string;
  lastSuccessfulSync?: string;
  lastError?: string;
  errorCount?: number;
  objectsIngested?: number;
  filters?: {
    types?: string[];
    addedAfter?: string;
  };
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tlp?: 'WHITE' | 'GREEN' | 'AMBER' | 'RED';
}

// ============================================================================
// Sync State Types
// ============================================================================

export interface TaxiiSyncState {
  feedId: string;
  collectionId: string;
  lastSyncTimestamp: string;
  lastObjectVersion?: string;
  nextCursor?: string;
  totalObjectsSynced: number;
  lastBatchSize: number;
  syncStatus: 'idle' | 'syncing' | 'error' | 'paused';
  errorMessage?: string;
  retryCount: number;
}

export interface TaxiiSyncResult {
  feedId: string;
  collectionId: string;
  success: boolean;
  objectsReceived: number;
  objectsProcessed: number;
  objectsStored: number;
  objectsSkipped: number;
  objectsFailed: number;
  errors: Array<{
    objectId?: string;
    message: string;
    code?: string;
  }>;
  startTime: string;
  endTime: string;
  durationMs: number;
  nextCursor?: string;
  hasMore: boolean;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface TaxiiHealthCheck {
  serverUrl: string;
  healthy: boolean;
  latencyMs?: number;
  serverVersion?: string;
  availableApiRoots?: string[];
  availableCollections?: number;
  lastChecked: string;
  error?: string;
}
