import { promises as fs } from 'fs';
import { tenantPolicyBundleSchema, type TenantPolicyBundle } from './tenantBundle.js';
import { loadSignedPolicy } from './loader.js';
import { BundleLoader } from './bundle/loader.js';

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
  // Check if it's a directory (new bundle format)
  const stat = await fs.stat(bundlePath).catch(() => null);
  if (stat && stat.isDirectory()) {
    const loader = new BundleLoader(bundlePath);
    const loaded = await loader.load();

    // The new bundle format contains many files.
    // We need to decide how to map it to TenantPolicyBundle or if we should support a different structure.
    // For now, to maintain compatibility, let's look for a "tenant-bundle.json" or similar in the bundle
    // if this function is expected to return a TenantPolicyBundle.
    // However, the prompt implies "Replace 'load raw policy files' with 'load verified bundle'".

    // If the caller expects a TenantPolicyBundle, we might be in the wrong place if the new bundle is system-wide.
    // But let's see if we can adapt.
    // If the bundle has a "bundle.json", we can use that metadata.

    // HACK: For now, if we load a directory bundle, we might need to construct a dummy TenantPolicyBundle
    // or finding a specific file inside.
    // Let's assume for now we fall back to existing behavior if not easily adaptable,
    // OR we throw an error if this function is strictly for Tenant Bundles (which seem different).

    // Actually, looking at `loadSignedPolicy`, it returns `buf`.
    // If we want to support the new bundle here, we'd need to change the return type or logic.

    // But wait, the prompt says: "Server consumes verified bundles and reports bundle identity."
    // Maybe we should introduce a `SystemPolicyBundleStore` or update `PolicyBundleStore`.

    // Since I cannot easily refactor the entire tenant bundle logic without risk,
    // I will log that we loaded a system bundle but fail this specific function if it expects a single JSON.
    // UNLESS we find a way to represent the system bundle as a TenantPolicyBundle (unlikely).

    // However, to satisfy "Server consumes verified bundles", I should probably add a method to load the system bundle.

    console.log(`Loaded system policy bundle from ${bundlePath} (ID: ${loaded.manifest.bundle_id})`);

    // We throw here because this function signature returns PolicyBundleVersion which wraps TenantPolicyBundle.
    // The new bundle is a "System Bundle" containing many policies.
    throw new Error('loadPolicyBundleFromDisk does not support directory bundles yet. Use SystemBundleStore.');
  }

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

export class SystemBundleStore {
  private currentBundle?: any;

  async load(path: string) {
    const loader = new BundleLoader(path);
    this.currentBundle = await loader.load();
    console.log(`System Policy Bundle Loaded: ${this.currentBundle.manifest.bundle_id}`);
    return this.currentBundle;
  }

  get() {
    return this.currentBundle;
  }
}

export const systemBundleStore = new SystemBundleStore();

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
