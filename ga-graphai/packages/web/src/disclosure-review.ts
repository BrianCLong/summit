export interface DisclosureArtifact {
  id: string;
  path: string;
  role: string;
}

export interface DisclosureReview {
  licenseId?: string;
  audiencePolicyId?: string;
  artifacts: DisclosureArtifact[];
  redactionCount: number;
  redactedFields: string[];
  estimatedSizeMb: number;
  estimatedCostUsd: number;
}

export interface DisclosureArtifactDiff {
  added: DisclosureArtifact[];
  removed: DisclosureArtifact[];
  unchanged: DisclosureArtifact[];
}

export interface DisclosureManifestLike {
  documents: { id: string; path: string; role?: string }[];
  exhibits?: { id: string; path: string; role?: string }[];
  evidence?: { id: string; path: string; role?: string }[];
  disclosure?: {
    audience?: { policyId?: string };
    license?: { id?: string };
    redactions?: { field: string }[];
  };
}

export const LICENSE_OPTIONS = [
  { id: "CC-BY-4.0", name: "Creative Commons BY 4.0" },
  { id: "CC-BY-SA-4.0", name: "Creative Commons BY-SA 4.0" },
  { id: "PROPRIETARY", name: "Proprietary / Restricted" },
];

export function estimateBundleCost(
  totalBytes: number,
  options: { usdPerMb?: number } = {}
): { estimatedSizeMb: number; estimatedCostUsd: number } {
  const usdPerMb = options.usdPerMb ?? 0.02;
  const estimatedSizeMb = Number((totalBytes / (1024 * 1024)).toFixed(2));
  const estimatedCostUsd = Number((estimatedSizeMb * usdPerMb).toFixed(2));
  return { estimatedSizeMb, estimatedCostUsd };
}

export function buildDisclosureReview(
  manifest: DisclosureManifestLike,
  totalBytes: number
): DisclosureReview {
  const artifacts: DisclosureArtifact[] = [
    ...manifest.documents.map((doc) => ({
      id: doc.id,
      path: doc.path,
      role: doc.role ?? "document",
    })),
    ...(manifest.exhibits ?? []).map((exhibit) => ({
      id: exhibit.id,
      path: exhibit.path,
      role: exhibit.role ?? "exhibit",
    })),
    ...(manifest.evidence ?? []).map((evidence) => ({
      id: evidence.id,
      path: evidence.path,
      role: evidence.role ?? "evidence",
    })),
  ];
  const redactionFields = Array.from(
    new Set((manifest.disclosure?.redactions ?? []).map((redaction) => redaction.field))
  );
  const { estimatedSizeMb, estimatedCostUsd } = estimateBundleCost(totalBytes);
  return {
    licenseId: manifest.disclosure?.license?.id,
    audiencePolicyId: manifest.disclosure?.audience?.policyId,
    artifacts,
    redactionCount: manifest.disclosure?.redactions?.length ?? 0,
    redactedFields: redactionFields,
    estimatedSizeMb,
    estimatedCostUsd,
  };
}

export function diffArtifacts(
  previous: DisclosureArtifact[],
  current: DisclosureArtifact[]
): DisclosureArtifactDiff {
  const previousIds = new Set(previous.map((artifact) => artifact.id));
  const currentIds = new Set(current.map((artifact) => artifact.id));
  return {
    added: current.filter((artifact) => !previousIds.has(artifact.id)),
    removed: previous.filter((artifact) => !currentIds.has(artifact.id)),
    unchanged: current.filter((artifact) => previousIds.has(artifact.id)),
  };
}
