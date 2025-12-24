import { z } from 'zod';

// Semver regex (simplified for stability without external dep)
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const PluginTypeSchema = z.enum(['connector', 'scorer', 'pattern', 'exporter']);

export const PluginCapabilitySchema = z.enum([
  'read:graph',
  'write:graph',
  'read:files',
  'write:files',
  'net:outbound',
  'compute:heavy'
]);

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const PluginManifestSchema = z.object({
  name: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/, "Name must be kebab-case"),
  version: z.string().regex(SEMVER_REGEX, "Must be valid semver"),
  type: PluginTypeSchema,
  capabilities: z.array(PluginCapabilitySchema).default([]),
  requiredScopes: z.array(z.string()).default([]),
  riskLevel: RiskLevelSchema.default('low'),
  configSchema: z.record(z.any()).optional(), // JSON Schema or Zod definition in JSON
  owner: z.string().email(),
  description: z.string().optional(),
});

// Explicit type definitions to avoid TS2503 error with z.infer when Zod is not properly resolved in some environments
export type PluginType = 'connector' | 'scorer' | 'pattern' | 'exporter';
export type PluginCapability = 'read:graph' | 'write:graph' | 'read:files' | 'write:files' | 'net:outbound' | 'compute:heavy';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type PluginManifest = {
    name: string;
    version: string;
    type: PluginType;
    capabilities: PluginCapability[];
    requiredScopes: string[];
    riskLevel: RiskLevel;
    configSchema?: Record<string, any>;
    owner: string;
    description?: string;
};

export interface PluginLifecycle {
  init(config: any): Promise<void>;
  health(): Promise<{ status: 'ok' | 'degraded' | 'down'; details?: any }>;
  shutdown(): Promise<void>;
}

export interface SandboxOptions {
  timeoutMs?: number;
  memoryLimitMb?: number;
  allowNetwork?: boolean;
}

export interface PluginInstance extends PluginLifecycle {
  manifest: PluginManifest;
}
