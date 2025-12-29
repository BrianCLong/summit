import { emitAuditEvent } from '../audit/emit.js';
import { loadPolicyBundleFromDisk, policyBundleStore } from './bundleStore.js';

function assertHotReloadEnabled() {
  const enabled = (process.env.POLICY_HOT_RELOAD || '').toLowerCase() === 'true';
  if (!enabled) {
    throw new Error('policy hot reload disabled');
  }
}

export class PolicyHotReloadService {
  async reload(bundlePath: string, signaturePath?: string) {
    assertHotReloadEnabled();
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

    return version;
  }

  async rollback(versionId: string) {
    assertHotReloadEnabled();
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

    return version;
  }
}

export const policyHotReloadService = new PolicyHotReloadService();
