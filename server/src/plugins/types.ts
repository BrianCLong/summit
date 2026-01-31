import { TrustTier } from '../marketplace/types.js';

export type CapabilityType =
  | 'network.outbound'
  | 'fs.read'
  | 'env.read'
  | 'vault.read'
  | 'cache.write';

export interface PluginCapability {
  type: CapabilityType;
  // Optional constraints, e.g., allowed hosts for network, allowed paths for fs
  constraints?: string[];
}

export interface PluginManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  capabilities: PluginCapability[];
  entryPoint: string; // e.g. "index.js"
  trustTier: TrustTier;
  signature?: string;
  author: string;
}

export interface PluginPackage {
  manifest: PluginManifest;
  code: string; // Base64 encoded or raw string of the source code
  signature: string;
}

export enum PluginStatus {
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVOKED = 'REVOKED',
}

export interface RegisteredPlugin {
  id: string;
  manifest: PluginManifest;
  code: string;
  status: PluginStatus;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  history: PluginHistoryEvent[];
}

export interface PluginHistoryEvent {
  date: Date;
  action: string;
  actor: string;
  details?: any;
}

export interface PluginContext {
  // Safe, proxied capabilities
  fetch?: (url: string, init?: any) => Promise<any>;
  fs?: {
    readFile: (path: string) => Promise<string>;
  };
  vault?: {
    read: (path: string) => Promise<any>;
  };
  cache?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl?: number) => Promise<void>;
  };
  // Always available utilities
  log: (message: string) => void;
}
