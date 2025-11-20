/**
 * TAXII 2.1 Type Definitions
 * Trusted Automated eXchange of Indicator Information (TAXII™) 2.1
 */

export type TaxiiVersion = '2.1';

export interface TaxiiResource {
  title: string;
  description?: string;
  versions?: string[];
  max_content_length?: number;
}

export interface TaxiiDiscovery extends TaxiiResource {
  default?: string;
  api_roots?: string[];
}

export interface TaxiiApiRoot extends TaxiiResource {
  title: string;
  description?: string;
  versions: string[];
  max_content_length: number;
}

export interface TaxiiCollection extends TaxiiResource {
  id: string;
  title: string;
  description?: string;
  alias?: string;
  can_read: boolean;
  can_write: boolean;
  media_types?: string[];
}

export interface TaxiiCollections {
  collections: TaxiiCollection[];
}

export interface TaxiiManifestEntry {
  id: string;
  date_added: string;
  versions: string[];
  media_types?: string[];
}

export interface TaxiiManifest {
  more?: boolean;
  objects: TaxiiManifestEntry[];
}

export interface TaxiiEnvelope {
  more?: boolean;
  next?: string;
  objects: any[];
}

export interface TaxiiStatus {
  id: string;
  status: 'complete' | 'pending' | 'error';
  request_timestamp?: string;
  total_count: number;
  success_count: number;
  failure_count: number;
  pending_count: number;
  successes?: TaxiiStatusDetail[];
  failures?: TaxiiStatusDetail[];
  pendings?: TaxiiStatusDetail[];
}

export interface TaxiiStatusDetail {
  id: string;
  version?: string;
  message?: string;
}

export interface TaxiiError {
  title: string;
  description?: string;
  error_id?: string;
  error_code?: string;
  http_status?: string;
  external_details?: string;
  details?: { [key: string]: any };
}

// TAXII Client Configuration

export interface TaxiiClientConfig {
  apiRoot: string;
  username?: string;
  password?: string;
  apiKey?: string;
  headers?: { [key: string]: string };
  timeout?: number;
  verifySsl?: boolean;
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

export interface TaxiiServerConfig {
  discoveryUrl: string;
  apiRootUrl: string;
  collectionId: string;
  auth: {
    type: 'basic' | 'bearer' | 'api-key';
    credentials: {
      username?: string;
      password?: string;
      token?: string;
      apiKey?: string;
    };
  };
  pollInterval?: number;
  batchSize?: number;
}

export interface TaxiiQueryParams {
  added_after?: string;
  limit?: number;
  next?: string;
  match?: {
    id?: string[];
    type?: string[];
    version?: string[];
    spec_version?: string[];
  };
}
