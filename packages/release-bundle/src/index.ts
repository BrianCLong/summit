import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';

// --- Types & Schemas ---

export const ReleaseStatusSchema = z.enum(['draft', 'ready', 'deprecated', 'archived']);
export type ReleaseStatus = z.infer<typeof ReleaseStatusSchema>;

export const BundleIndexSchema = z.object({
  schemaVersion: z.string(),
  entries: z.record(z.string(), z.string()), // path -> hash
});
export type BundleIndex = z.infer<typeof BundleIndexSchema>;

export const ReleaseManifestSchema = z.object({
  schemaVersion: z.string(),
  name: z.string(),
  version: z.string(),
  majorVersion: z.number().optional(),
  artifacts: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ReleaseManifest = z.infer<typeof ReleaseManifestSchema>;

export const ProvenanceStatementSchema = z.object({
  schemaVersion: z.string().optional(),
  _type: z.string().optional(), // Common in in-toto
  subject: z.array(z.object({
    name: z.string(),
    digest: z.record(z.string(), z.string()),
  })).optional(),
  predicateType: z.string().optional(),
  predicate: z.record(z.string(), z.unknown()).optional(),
}).passthrough(); // Allow other fields for flexibility
export type ProvenanceStatement = z.infer<typeof ProvenanceStatementSchema>;

export type CompatibilityResult =
  | { compatible: true }
  | { compatible: false; reason: string };

export interface BundleArtifacts {
  status?: ReleaseStatus;
  index?: BundleIndex;
  manifest?: ReleaseManifest;
  provenance?: ProvenanceStatement;
}

// --- Parsers ---

export function parseReleaseStatus(json: unknown): ReleaseStatus {
  // Supports raw string or { status: "..." } object
  const schema = z.union([
    ReleaseStatusSchema,
    z.object({ status: ReleaseStatusSchema }).transform(o => o.status)
  ]);

  return schema.parse(json);
}

export function parseBundleIndex(json: unknown): BundleIndex {
  return BundleIndexSchema.parse(json);
}

export function parseReleaseManifest(json: unknown): ReleaseManifest {
  return ReleaseManifestSchema.parse(json);
}

export function parseProvenance(json: unknown): ProvenanceStatement {
  return ProvenanceStatementSchema.parse(json);
}

// --- Logic ---

export function checkCompatibility(
  artifacts: BundleArtifacts,
  supportedMajor = 1
): CompatibilityResult {
  if (artifacts.manifest) {
    let major = artifacts.manifest.majorVersion;

    // If explicit majorVersion is missing, try to infer from version string
    if (major === undefined && artifacts.manifest.version) {
        const match = artifacts.manifest.version.match(/^v?(\d+)/);
        if (match) {
            major = parseInt(match[1], 10);
        }
    }

    if (major !== undefined && major !== supportedMajor) {
        return {
          compatible: false,
          reason: `Artifact major version ${major} does not match supported version ${supportedMajor}`
        };
    }
  }

  return { compatible: true };
}

export async function loadBundleFromDir(dir: string): Promise<BundleArtifacts> {
    const result: BundleArtifacts = {};

    const loadJSON = async <T>(filename: string, parser: (json: unknown) => T): Promise<T | undefined> => {
        try {
            const content = await fs.readFile(path.join(dir, filename), 'utf-8');
            return parser(JSON.parse(content));
        } catch (error: any) {
            if (error.code === 'ENOENT') return undefined;
            // Wrap error to provide context
            throw new Error(`Failed to parse ${filename} in ${dir}: ${error.message}`);
        }
    };

    // Try standard filenames and common variations
    result.status = await loadJSON('status.json', parseReleaseStatus)
                 ?? await loadJSON('release-status.json', parseReleaseStatus);

    result.index = await loadJSON('index.json', parseBundleIndex)
                ?? await loadJSON('bundle-index.json', parseBundleIndex);

    result.manifest = await loadJSON('manifest.json', parseReleaseManifest)
                   ?? await loadJSON('release-manifest.json', parseReleaseManifest);

    result.provenance = await loadJSON('provenance.json', parseProvenance)
                     ?? await loadJSON('provenance-statement.json', parseProvenance);

    return result;
}
