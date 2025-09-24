import type {
  AssignmentPlan,
  ManualControlPlan,
  WorkParcelPlan
} from '../../common-types/src/index.js';
import type {
  ExportManifest,
  ManifestVerificationResult
} from 'prov-ledger';

type ControlToggle = {
  readonly label: string;
  readonly enabled: boolean;
};

export interface ControlMatrixRow {
  readonly ticketId: string;
  readonly workerId: string;
  readonly toggles: readonly ControlToggle[];
}

function togglesFromPlan(plan: ManualControlPlan): readonly ControlToggle[] {
  return [
    { label: 'Pause before navigation', enabled: plan.pauseBeforeNavigation },
    { label: 'Pause before prompt', enabled: plan.pauseBeforePrompt },
    { label: 'Pause before capture', enabled: plan.pauseBeforeCapture },
  ];
}

function rowFromParcel(parcel: WorkParcelPlan): ControlMatrixRow {
  return {
    ticketId: parcel.ticket.id,
    workerId: parcel.worker.id,
    toggles: togglesFromPlan(parcel.manualControl),
  };
}

export function buildControlMatrix(plan: AssignmentPlan): readonly ControlMatrixRow[] {
  return plan.parcels.map(rowFromParcel);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  for (const unit of units) {
    if (value < 1024) {
      return `${value.toFixed(1)} ${unit}`;
    }
    value /= 1024;
  }
  return `${value.toFixed(1)} TB`;
}

export interface ManifestArtifactSummary {
  readonly path: string;
  readonly digest: string;
  readonly role: string;
  readonly size: string;
}

export interface ManifestTransformSummary {
  readonly op: string;
  readonly tool: string;
  readonly digest: string;
  readonly signer?: string;
}

export interface ManifestSignatureSummary {
  readonly keyId: string;
  readonly algorithm: string;
  readonly signedAt?: string;
}

export interface ManifestSummary {
  readonly exportId: string;
  readonly createdAt: string;
  readonly source: string;
  readonly fetchedAt?: string;
  readonly url?: string;
  readonly artifacts: readonly ManifestArtifactSummary[];
  readonly transforms: readonly ManifestTransformSummary[];
  readonly signatures: readonly ManifestSignatureSummary[];
  readonly policy: {
    readonly selectiveDisclosure: boolean;
    readonly redactions: readonly string[];
    readonly notes?: string;
  };
}

export function buildManifestSummary(manifest: ExportManifest): ManifestSummary {
  return {
    exportId: manifest.exportId,
    createdAt: manifest.createdAt,
    source: manifest.provenance.source,
    fetchedAt: manifest.provenance.fetchedAt,
    url: manifest.provenance.url,
    artifacts: manifest.artifacts.map(artifact => ({
      path: artifact.path,
      digest: artifact.sha256,
      role: artifact.role,
      size: formatBytes(artifact.bytes)
    })),
    transforms: manifest.transforms.map(transform => ({
      op: transform.op,
      tool: transform.tool,
      digest: transform.outputSha256,
      signer: transform.signer
    })),
    signatures: manifest.signatures.map(signature => ({
      keyId: signature.keyId,
      algorithm: signature.alg,
      signedAt: signature.signedAt
    })),
    policy: {
      selectiveDisclosure: Boolean(manifest.policy.selectiveDisclosure),
      redactions: manifest.policy.redactions.map(redaction => redaction.field),
      notes: manifest.policy.notes
    }
  };
}

export interface DisclosureToggle {
  readonly field: string;
  readonly included: boolean;
  readonly reason?: string;
}

export function buildSelectiveDisclosureToggles(
  manifest: ExportManifest,
  options: { excludedFields?: readonly string[] } = {}
): readonly DisclosureToggle[] {
  const excluded = new Set(options.excludedFields ?? []);
  const toggles: DisclosureToggle[] = manifest.policy.redactions.map(redaction => ({
    field: redaction.field,
    included: !excluded.has(redaction.field),
    reason: redaction.reason
  }));

  if (toggles.length === 0) {
    return [];
  }
  return toggles;
}

export function manifestWarnings(
  manifest: ExportManifest,
  verification?: ManifestVerificationResult
): readonly string[] {
  const warnings = new Set<string>();
  if (manifest.signatures.length === 0) {
    warnings.add('No signatures present on manifest.');
  }
  if (manifest.policy.selectiveDisclosure) {
    warnings.add('Selective disclosure active; some fields hidden.');
  }
  if (Array.isArray(manifest.unverifiable)) {
    for (const issue of manifest.unverifiable) {
      warnings.add(issue);
    }
  }
  if (verification && verification.status !== 'pass') {
    for (const issue of verification.issues) {
      warnings.add(issue);
    }
  }
  return [...warnings];
}

export const ui = {
  buildControlMatrix,
  buildManifestSummary,
  buildSelectiveDisclosureToggles,
  manifestWarnings
};
