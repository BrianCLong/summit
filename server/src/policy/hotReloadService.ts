import { emitAuditEvent } from '../audit/emit.js';
import { ReceiptService } from '../services/ReceiptService.js';
import { AuditService } from '../services/security/AuditService.js';
import { loadPolicyBundleFromDisk, policyBundleStore } from './bundleStore.js';
import { areRampConfigsEqual, normalizeRampConfig, type RampConfig } from './ramp.js';

function assertHotReloadEnabled() {
  const enabled = (process.env.POLICY_HOT_RELOAD || '').toLowerCase() === 'true';
  if (!enabled) {
    throw new Error('policy hot reload disabled');
  }
}

export class PolicyHotReloadService {
  private async recordRampChange(params: {
    action: string;
    tenantId: string;
    versionId: string;
    digest: string;
    signatureVerified: boolean;
    before?: unknown;
    after?: unknown;
  }) {
    const before = normalizeRampConfig(params.before as Partial<RampConfig> | undefined);
    const after = normalizeRampConfig(params.after as Partial<RampConfig> | undefined);
    if (areRampConfigsEqual(before, after)) return;

    const receiptService = ReceiptService.getInstance();
    const receipt = await receiptService.generateReceipt({
      action: params.action,
      actor: { id: 'system', tenantId: params.tenantId },
      resource: `policy_bundle:${params.versionId}`,
      input: {
        before,
        after,
        versionId: params.versionId,
        digest: params.digest,
        signatureVerified: params.signatureVerified,
      },
    });

    await AuditService.log({
      userId: 'system',
      action: params.action,
      resourceType: 'policy_bundle',
      resourceId: params.versionId,
      details: {
        receiptId: receipt.id,
        digest: params.digest,
        signatureVerified: params.signatureVerified,
      },
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
    });
  }

  async reload(bundlePath: string, signaturePath?: string) {
    assertHotReloadEnabled();
    const previous = policyBundleStore.getCurrent();
    const version = await loadPolicyBundleFromDisk(bundlePath, signaturePath);
    policyBundleStore.addVersion(version, true);

    await emitAuditEvent(
      {
        eventId: version.versionId,
        occurredAt: new Date().toISOString(),
        tenantId: version.bundle.tenantId,
        actor: { id: 'system', type: 'service' },
        action: { type: 'policy.reload', outcome: 'success' },
        target: { type: 'policy_bundle', id: version.versionId },
        metadata: {
          digest: version.digest,
          signatureVerified: version.signatureVerified,
          path: version.path,
        },
      },
      { level: 'critical', serviceId: 'policy-hot-reload' },
    );

    await this.recordRampChange({
      action: 'policy.ramp.updated',
      tenantId: version.bundle.tenantId,
      versionId: version.versionId,
      digest: version.digest,
      signatureVerified: version.signatureVerified,
      before: previous?.bundle?.baseProfile?.ramp,
      after: version.bundle.baseProfile?.ramp,
    });

    return version;
  }

  async rollback(versionId: string) {
    // Sprint 08: Automated rollback trigger check
    // In a real system, this would verify the rollback target is stable
    const previous = policyBundleStore.getCurrent();
    const version = policyBundleStore.rollback(versionId);

    await emitAuditEvent(
      {
        eventId: `${version.versionId}-rollback`,
        occurredAt: new Date().toISOString(),
        tenantId: version.bundle.tenantId,
        actor: { id: 'system', type: 'service' },
        action: { type: 'policy.rollback', outcome: 'success' },
        target: { type: 'policy_bundle', id: version.versionId },
        metadata: { digest: version.digest },
      },
      { level: 'critical', serviceId: 'policy-hot-reload' },
    );

    await this.recordRampChange({
      action: 'policy.ramp.rollback',
      tenantId: version.bundle.tenantId,
      versionId: version.versionId,
      digest: version.digest,
      signatureVerified: version.signatureVerified,
      before: previous?.bundle?.baseProfile?.ramp,
      after: version.bundle.baseProfile?.ramp,
    });

    return version;
  }
}

export const policyHotReloadService = new PolicyHotReloadService();
