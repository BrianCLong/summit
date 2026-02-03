/**
 * Switchboard Capsule Manifest
 *
 * Defines the V2 capsule manifest schema and helpers for loading capsules.
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import yaml from 'yaml';

const PathListSchema = z.object({
  read: z.array(z.string()).default([]),
  write: z.array(z.string()).default([]),
});

const TimePinSchema = z.object({
  timezone: z.string().optional(),
  locale: z.string().optional(),
  fixed_time: z.string().optional(),
});

const WaiverSchema = z.object({
  token: z.string(),
  reason: z.string(),
  expires_at: z.string().optional(),
});

const StepSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  command: z.string(),
  args: z.array(z.string()).default([]),
  reads: z.array(z.string()).default([]),
  writes: z.array(z.string()).default([]),
  allow_network: z.boolean().default(false),
  secrets: z.array(z.string()).default([]),
  category: z.enum(['command', 'test']).default('command'),
});

export const CapsuleManifestSchema = z.object({
  version: z.string().default('v2'),
  name: z.string().optional(),
  allowed_paths: PathListSchema.default({ read: [], write: [] }),
  allowed_commands: z.array(z.string()).default([]),
  network_mode: z.enum(['off', 'on']).default('off'),
  env_allowlist: z.array(z.string()).default([]),
  time: TimePinSchema.default({}),
  secret_handles: z.array(z.string()).default([]),
  waivers: z.array(WaiverSchema).default([]),
  steps: z.array(StepSchema).default([]),
}).strict();

export type CapsuleManifest = z.infer<typeof CapsuleManifestSchema>;
export type CapsuleStep = z.infer<typeof StepSchema>;
export type CapsuleWaiver = z.infer<typeof WaiverSchema>;

export function normalizeRelativePath(inputPath: string): string | null {
  if (!inputPath) {
    return null;
  }
  if (path.isAbsolute(inputPath)) {
    return null;
  }
  const normalized = path.posix.normalize(inputPath.replace(/\\/g, '/'));
  if (normalized.startsWith('..')) {
    return null;
  }
  return normalized;
}

export function loadCapsuleManifest(manifestPath: string): CapsuleManifest {
  const resolvedPath = path.resolve(manifestPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Capsule manifest not found: ${manifestPath}`);
  }
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = yaml.parse(raw);
  const manifest = CapsuleManifestSchema.parse(parsed);
  return manifest;
}
