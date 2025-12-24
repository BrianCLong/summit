// @ts-nocheck
import adapterManifest from './data/adapter-manifest.json';
import type { ResourceAttributes, SubjectAttributes } from './types';

export interface AdapterManifestEntry {
  id: string;
  name: string;
  capabilities?: string[];
  requiredPermissions: string[];
  claims?: Record<string, unknown>;
}

const manifestIndex: Record<string, AdapterManifestEntry> = Object.fromEntries(
  (adapterManifest as AdapterManifestEntry[]).map((entry) => [entry.id, entry]),
);

export function getAdapterManifest(adapterId: string): AdapterManifestEntry | undefined {
  return manifestIndex[adapterId];
}

export function missingAdapterPermissions(
  subject: SubjectAttributes,
  adapter: AdapterManifestEntry,
): string[] {
  return (adapter.requiredPermissions || []).filter(
    (perm) => !subject.entitlements.includes(perm),
  );
}

export function buildAdapterResource(
  adapter: AdapterManifestEntry,
  subject: SubjectAttributes,
  resource?: Partial<ResourceAttributes>,
): ResourceAttributes {
  const fallback: ResourceAttributes = {
    id: adapter.id,
    tenantId: resource?.tenantId || subject.tenantId,
    residency: resource?.residency || subject.residency,
    classification: resource?.classification || subject.clearance,
    tags: resource?.tags || [],
    claims: adapter.claims ?? {},
    requiredPermissions: adapter.requiredPermissions ?? [],
    adapterId: adapter.id,
    capabilities: adapter.capabilities ?? [],
  };

  if (!resource) {
    return fallback;
  }

  return {
    ...fallback,
    ...resource,
    tags: resource.tags ?? fallback.tags,
    claims: {
      ...(fallback.claims ?? {}),
      ...(resource.claims ?? {}),
    },
    requiredPermissions: resource.requiredPermissions ?? fallback.requiredPermissions,
    capabilities: resource.capabilities ?? fallback.capabilities,
    adapterId: resource.adapterId ?? fallback.adapterId,
  };
}
