import { promises as fs } from 'fs';
import { tenantPolicyBundleSchema, type TenantPolicyBundle } from './tenantBundle.js';
import { loadSignedPolicy } from './loader.js';

export interface PolicyBundleVersion {
  versionId: string;
  path: string;
  digest: string;
  loadedAt: Date;
  signatureVerified: boolean;
  bundle: TenantPolicyBundle;
}

function deriveVersionId(bundle: TenantPolicyBundle, digest: string): string {
  return (
    bundle.bundleId ||
    bundle.baseProfile?.version ||
    `${bundle.tenantId}-${bundle.baseProfile?.regoPackage || 'policy'}-${digest.slice(0, 12)}`
  );
}

export async function loadPolicyBundleFromDisk(
  bundlePath: string,
  signaturePath?: string,
): Promise<PolicyBundleVersion> {
  const verification = await loadSignedPolicy(bundlePath, signaturePath);
  const content = verification.buf.toString('utf8');
  const parsed = tenantPolicyBundleSchema.parse(JSON.parse(content));
  const versionId = deriveVersionId(parsed, verification.digest);

  return {
    versionId,
    path: verification.path,
    digest: verification.digest,
    loadedAt: new Date(),
    signatureVerified: verification.signatureVerified,
    bundle: parsed,
  } as const;
}

class PolicyBundleStore {
  private versions: Map<string, PolicyBundleVersion> = new Map();
  currentPolicyVersionId?: string;

  reset(): void {
    this.versions.clear();
    this.currentPolicyVersionId = undefined;
  }

  addVersion(version: PolicyBundleVersion, makeCurrent = true): PolicyBundleVersion {
    this.versions.set(version.versionId, version);
    if (makeCurrent) this.currentPolicyVersionId = version.versionId;
    return version;
  }

  get(versionId: string): PolicyBundleVersion | undefined {
    return this.versions.get(versionId);
  }

  getCurrent(): PolicyBundleVersion | undefined {
    return this.currentPolicyVersionId ? this.versions.get(this.currentPolicyVersionId) : undefined;
  }

  resolveForTenant(
    tenantId: string,
    versionId?: string,
  ): PolicyBundleVersion | undefined {
    if (versionId) {
      const byVersion = this.versions.get(versionId);
      if (byVersion && byVersion.bundle.tenantId === tenantId) return byVersion;
    }

    const current = this.getCurrent();
    if (current && current.bundle.tenantId === tenantId) return current;

    const candidates = Array.from(this.versions.values())
      .filter((version) => version.bundle.tenantId === tenantId)
      .sort((a, b) => a.loadedAt.getTime() - b.loadedAt.getTime());

    return candidates.at(-1);
  }

  list(): PolicyBundleVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => a.loadedAt.getTime() - b.loadedAt.getTime());
  }

  resolve(versionId?: string): PolicyBundleVersion {
    const candidate = versionId && this.versions.get(versionId);
    if (candidate) return candidate;
    const current = this.getCurrent();
    if (!current) {
      throw new Error('no policy bundles loaded');
    }
    return current;
  }

  rollback(toVersion: string): PolicyBundleVersion {
    const target = this.versions.get(toVersion);
    if (!target) {
      throw new Error(`policy version ${toVersion} not found`);
    }
    this.currentPolicyVersionId = target.versionId;
    return target;
  }
}

export const policyBundleStore = new PolicyBundleStore();
