import {
  CaseRetentionOverride,
  EvidenceTypeOverride,
  ResolvedRetentionPolicy,
  RetentionRecord,
  TenantRetentionPolicy,
} from './types.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function buildCaseKey(
  tenantId: string,
  caseId: string,
  evidenceType?: string,
): string {
  return `${tenantId}:${caseId}:${evidenceType ?? '*'}`;
}

export class RetentionPolicyModel {
  private readonly tenantDefaults = new Map<string, TenantRetentionPolicy>();
  private readonly caseOverrides = new Map<string, CaseRetentionOverride>();
  private readonly evidenceOverrides = new Map<string, EvidenceTypeOverride>();

  constructor(initial?: {
    tenants?: TenantRetentionPolicy[];
    cases?: CaseRetentionOverride[];
    evidenceTypes?: EvidenceTypeOverride[];
  }) {
    initial?.tenants?.forEach((policy) =>
      this.tenantDefaults.set(policy.tenantId, policy),
    );
    initial?.cases?.forEach((policy) =>
      this.caseOverrides.set(
        buildCaseKey(policy.tenantId, policy.caseId, policy.evidenceType),
        policy,
      ),
    );
    initial?.evidenceTypes?.forEach((policy) =>
      this.evidenceOverrides.set(
        `${policy.tenantId}:${policy.evidenceType}`,
        policy,
      ),
    );
  }

  setTenantDefault(policy: TenantRetentionPolicy): void {
    this.tenantDefaults.set(policy.tenantId, policy);
  }

  setCaseOverride(policy: CaseRetentionOverride): void {
    this.caseOverrides.set(
      buildCaseKey(policy.tenantId, policy.caseId, policy.evidenceType),
      policy,
    );
  }

  setEvidenceTypeOverride(policy: EvidenceTypeOverride): void {
    this.evidenceOverrides.set(
      `${policy.tenantId}:${policy.evidenceType}`,
      policy,
    );
  }

  resolve(record: RetentionRecord): ResolvedRetentionPolicy {
    const appliedLayers: string[] = [
      `applied-policy:${record.policy.templateId}`,
    ];

    const resolved: ResolvedRetentionPolicy = {
      retentionDays: record.policy.retentionDays,
      purgeGraceDays: record.policy.purgeGraceDays,
      source: 'applied-policy',
      appliedPolicyId: record.policy.templateId,
      appliedLayers,
    };

    const tenantId = record.metadata.tenantId;
    const caseId = record.metadata.caseId;
    const evidenceType = record.metadata.evidenceType;

    if (tenantId && this.tenantDefaults.has(tenantId)) {
      const tenantPolicy = this.tenantDefaults.get(tenantId)!;
      resolved.retentionDays = tenantPolicy.retentionDays;
      resolved.purgeGraceDays =
        tenantPolicy.purgeGraceDays ?? resolved.purgeGraceDays;
      resolved.source = 'tenant-default';
      resolved.appliedLayers.push(`tenant:${tenantId}`);
      resolved.reason =
        tenantPolicy.notes ??
        'Tenant default retention policy applied for dataset.';
    }

    if (tenantId && caseId) {
      const casePolicy =
        this.caseOverrides.get(buildCaseKey(tenantId, caseId, evidenceType)) ??
        this.caseOverrides.get(buildCaseKey(tenantId, caseId));

      if (casePolicy) {
        resolved.retentionDays = casePolicy.retentionDays;
        resolved.purgeGraceDays =
          casePolicy.purgeGraceDays ?? resolved.purgeGraceDays;
        resolved.source = 'case-override';
        resolved.appliedLayers.push(`case:${casePolicy.caseId}`);
        resolved.reason =
          casePolicy.reason ??
          `Case override applied for case ${casePolicy.caseId}.`;
      }
    }

    if (tenantId && evidenceType) {
      const evidencePolicy = this.evidenceOverrides.get(
        `${tenantId}:${evidenceType}`,
      );
      if (evidencePolicy) {
        resolved.retentionDays = evidencePolicy.retentionDays;
        resolved.purgeGraceDays =
          evidencePolicy.purgeGraceDays ?? resolved.purgeGraceDays;
        resolved.source = 'evidence-type-override';
        resolved.appliedLayers.push(`evidence:${evidencePolicy.evidenceType}`);
        resolved.reason =
          evidencePolicy.reason ??
          `Evidence type override applied for ${evidencePolicy.evidenceType}.`;
      }
    }

    return resolved;
  }

  calculateDeletionWindow(record: RetentionRecord): {
    expiresAt: Date;
    deleteAfter: Date;
  } {
    const resolved = this.resolve(record);
    const createdAt = record.metadata.createdAt;
    const expiresAt = new Date(
      createdAt.getTime() + resolved.retentionDays * MS_PER_DAY,
    );
    const deleteAfter = new Date(
      expiresAt.getTime() + resolved.purgeGraceDays * MS_PER_DAY,
    );

    return { expiresAt, deleteAfter };
  }
}
