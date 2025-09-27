import crypto from 'node:crypto';

export type AssetKind = 'dataset' | 'model';
export type OutputType = AssetKind | 'service';
export type CommercialUse = 'allowed' | 'non-commercial' | 'prohibited';

export interface LicenseTerms {
  commercialUse: CommercialUse;
  requiresAttribution?: boolean;
  shareAlike?: boolean;
  fieldOfUseRestrictions?: string[];
  purposeRestrictions?: string[];
  revenueShare?: number;
  revocation?: {
    deletionRequired?: boolean;
    noticePeriodDays?: number;
  };
  additionalNotes?: string;
}

export interface LicensedAsset {
  id: string;
  kind: AssetKind;
  name: string;
  version?: string;
  terms: LicenseTerms;
}

export interface IntendedUse {
  commercial: boolean;
  fieldsOfUse?: string[];
  purposes?: string[];
}

export interface OutputDescriptor {
  id: string;
  type: OutputType;
  description: string;
  commercialization: 'internal' | 'external' | 'licensed';
  tags?: string[];
}

export interface AllowedOutput extends OutputDescriptor {
  conditions: string[];
}

export interface Obligation {
  type:
    | 'attribution'
    | 'share-alike'
    | 'field-restriction'
    | 'purpose-restriction'
    | 'revenue-share'
    | 'revocation';
  description: string;
  assets: string[];
  details?: Record<string, unknown>;
}

export interface ConstraintSummary {
  commercialUse: CommercialUse;
  requiresAttribution: boolean;
  shareAlike: boolean;
  fieldOfUse: string[];
  purpose: string[];
  revenueShare: number;
}

export interface DerivationPlan {
  allowed: boolean;
  reasons: string[];
  constraints: ConstraintSummary;
  obligations: Obligation[];
  allowedOutputs: AllowedOutput[];
}

export interface DerivationRequest {
  inputs: LicensedAsset[];
  intendedUse: IntendedUse;
  requestedOutputs: OutputDescriptor[];
}

export interface DerivationManifest extends DerivationPlan {
  manifestId: string;
  plannerVersion: string;
  createdAt: string;
  inputs: Array<{
    id: string;
    name: string;
    kind: AssetKind;
    version?: string;
    terms: LicenseTerms;
  }>;
}

export interface ManifestSigner {
  id: string;
  secret: string;
  algorithm?: 'sha256' | 'sha512';
}

export interface SignedDerivationManifest extends DerivationManifest {
  signature: string;
  signedBy: {
    id: string;
    algorithm: string;
  };
}

export interface PolicyChangeProposal {
  manifest: SignedDerivationManifest;
  policyDiffSummary: string;
  addedTags: string[];
  removedTags?: string[];
  targetBranch?: string;
}

const DEFAULT_VERSION = '1.0.0';

export class DerivationPlanner {
  constructor(private readonly signer: ManifestSigner) {}

  plan(request: DerivationRequest): DerivationPlan {
    const reasons: string[] = [];
    const attributionAssets = new Set<string>();
    const shareAlikeAssets = new Set<string>();
    const fieldRestrictions = new Set<string>();
    const purposeRestrictions = new Set<string>();
    const revocationAssets = new Set<string>();
    const obligations: Obligation[] = [];
    let commercialConstraint: CommercialUse = 'allowed';
    let maxRevenueShare = 0;

    for (const asset of request.inputs) {
      const { terms } = asset;
      if (terms.commercialUse === 'prohibited') {
        commercialConstraint = 'prohibited';
        if (request.intendedUse.commercial) {
          reasons.push(
            `${asset.name} license forbids commercial derivatives.`
          );
        }
      } else if (terms.commercialUse === 'non-commercial') {
        if (commercialConstraint !== 'prohibited') {
          commercialConstraint = 'non-commercial';
        }
        if (request.intendedUse.commercial) {
          reasons.push(
            `${asset.name} is limited to non-commercial use, blocking the requested plan.`
          );
        }
      }

      if (terms.requiresAttribution) {
        attributionAssets.add(asset.name);
      }

      if (terms.shareAlike) {
        shareAlikeAssets.add(asset.name);
      }

      if (terms.fieldOfUseRestrictions) {
        for (const field of terms.fieldOfUseRestrictions) {
          fieldRestrictions.add(field);
        }
      }

      if (terms.purposeRestrictions) {
        for (const purpose of terms.purposeRestrictions) {
          purposeRestrictions.add(purpose);
        }
      }

      if (terms.revenueShare && terms.revenueShare > maxRevenueShare) {
        maxRevenueShare = terms.revenueShare;
      }

      if (terms.revocation?.deletionRequired) {
        revocationAssets.add(asset.name);
      }
    }

    if (attributionAssets.size > 0) {
      obligations.push({
        type: 'attribution',
        description: `Provide attribution for ${Array.from(attributionAssets).join(', ')} in derivative outputs.`,
        assets: Array.from(attributionAssets),
        details: {
          style: 'public-facing notice',
        },
      });
    }

    if (shareAlikeAssets.size > 0) {
      obligations.push({
        type: 'share-alike',
        description:
          'Distribute derivatives under equivalent share-alike terms covering all upstream assets.',
        assets: Array.from(shareAlikeAssets),
      });
    }

    if (fieldRestrictions.size > 0) {
      obligations.push({
        type: 'field-restriction',
        description: 'Restrict downstream access in banned fields of use.',
        assets: request.inputs
          .filter((asset) =>
            (asset.terms.fieldOfUseRestrictions ?? []).some((field) =>
              fieldRestrictions.has(field)
            )
          )
          .map((asset) => asset.name),
        details: {
          restrictedFields: Array.from(fieldRestrictions).sort(),
        },
      });
    }

    if (purposeRestrictions.size > 0) {
      obligations.push({
        type: 'purpose-restriction',
        description: 'Enforce purpose limits for derivative access and deployment.',
        assets: request.inputs
          .filter((asset) =>
            (asset.terms.purposeRestrictions ?? []).some((purpose) =>
              purposeRestrictions.has(purpose)
            )
          )
          .map((asset) => asset.name),
        details: {
          restrictedPurposes: Array.from(purposeRestrictions).sort(),
        },
      });
    }

    if (maxRevenueShare > 0) {
      obligations.push({
        type: 'revenue-share',
        description: `Allocate at least ${(maxRevenueShare * 100).toFixed(1)}% of derivative revenue to upstream licensors.`,
        assets: request.inputs
          .filter((asset) => (asset.terms.revenueShare ?? 0) === maxRevenueShare)
          .map((asset) => asset.name),
        details: {
          minimumPercentage: maxRevenueShare,
        },
      });
    }

    if (revocationAssets.size > 0) {
      obligations.push({
        type: 'revocation',
        description:
          'Purge derivative artifacts and notify downstream users if access is revoked.',
        assets: Array.from(revocationAssets),
        details: {
          deletionWindowDays: Math.max(
            ...request.inputs
              .filter((asset) => asset.terms.revocation?.deletionRequired)
              .map((asset) => asset.terms.revocation?.noticePeriodDays ?? 30),
            30
          ),
        },
      });
    }

    const allowedOutputs: AllowedOutput[] = [];
    for (const output of request.requestedOutputs) {
      const conditions: string[] = [];
      if (commercialConstraint === 'non-commercial' && output.commercialization !== 'internal') {
        conditions.push('Limit distribution to non-commercial programs.');
      }
      if (commercialConstraint === 'prohibited') {
        conditions.push('Derivative may only be used internally for evaluation.');
      }
      if (fieldRestrictions.size > 0) {
        conditions.push(
          `Exclude deployment in: ${Array.from(fieldRestrictions)
            .sort()
            .join(', ')}`
        );
      }
      if (purposeRestrictions.size > 0) {
        conditions.push(
          `Limit use cases to exclude: ${Array.from(purposeRestrictions)
            .sort()
            .join(', ')}`
        );
      }

      if (reasons.length === 0) {
        allowedOutputs.push({
          ...output,
          conditions,
        });
      }
    }

    const constraints: ConstraintSummary = {
      commercialUse: commercialConstraint,
      requiresAttribution: attributionAssets.size > 0,
      shareAlike: shareAlikeAssets.size > 0,
      fieldOfUse: Array.from(fieldRestrictions).sort(),
      purpose: Array.from(purposeRestrictions).sort(),
      revenueShare: maxRevenueShare,
    };

    return {
      allowed: reasons.length === 0,
      reasons,
      constraints,
      obligations,
      allowedOutputs,
    };
  }

  createManifest(request: DerivationRequest): SignedDerivationManifest {
    const plan = this.plan(request);
    const manifest: DerivationManifest = {
      manifestId: crypto.randomUUID(),
      plannerVersion: DEFAULT_VERSION,
      createdAt: new Date().toISOString(),
      inputs: request.inputs.map((asset) => ({
        id: asset.id,
        name: asset.name,
        kind: asset.kind,
        version: asset.version,
        terms: asset.terms,
      })),
      ...plan,
    };

    const signature = signManifest(manifest, this.signer);

    return {
      ...manifest,
      signature,
      signedBy: {
        id: this.signer.id,
        algorithm: this.signer.algorithm ?? 'sha256',
      },
    };
  }
}

export function signManifest(
  manifest: DerivationManifest,
  signer: ManifestSigner
): string {
  const normalized = stableStringify(manifest);
  const hmac = crypto.createHmac(signer.algorithm ?? 'sha256', signer.secret);
  hmac.update(normalized);
  return hmac.digest('hex');
}

export function generatePolicyChangePR(
  proposal: PolicyChangeProposal
): string {
  const { manifest, policyDiffSummary, addedTags, removedTags = [], targetBranch } =
    proposal;
  const obligationLines = manifest.obligations.map(
    (obligation) =>
      `- **${obligation.type}**: ${obligation.description} (Assets: ${obligation.assets.join(', ')})`
  );
  const outputLines = manifest.allowedOutputs.map(
    (output) =>
      `- ${output.id} (${output.type}) → ${output.description}` +
      (output.conditions.length > 0
        ? `\n  - Conditions: ${output.conditions.join('; ')}`
        : '')
  );

  const tagSection = [
    addedTags.length
      ? `- Added tags: ${addedTags.sort().join(', ')}`
      : '- Added tags: _none_',
    removedTags.length
      ? `- Removed tags: ${removedTags.sort().join(', ')}`
      : '- Removed tags: _none_',
  ].join('\n');

  return [
    '# Policy Update Proposal',
    targetBranch ? `- Target branch: \`${targetBranch}\`` : null,
    '',
    '## Summary',
    policyDiffSummary.trim(),
    '',
    '## Obligations Snapshot',
    obligationLines.length > 0
      ? obligationLines.join('\n')
      : '- No additional obligations introduced.',
    '',
    '## Allowed Outputs',
    outputLines.length > 0
      ? outputLines.join('\n')
      : '- Derivation currently blocked by licensing conflicts.',
    '',
    '## Tag Adjustments',
    tagSection,
    '',
    '## Manifest Reference',
    `- Manifest ID: ${manifest.manifestId}`,
    `- Signed by: ${manifest.signedBy.id} (${manifest.signedBy.algorithm})`,
    `- Decision: ${manifest.allowed ? 'ALLOW' : 'DENY'}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  if (value && typeof value === 'object') {
    const sortedEntries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => [key, sortValue((value as Record<string, unknown>)[key])]);
    return Object.fromEntries(sortedEntries);
  }
  return value;
}

