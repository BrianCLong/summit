import { promises as fs } from 'fs';
import path from 'path';
import { TenantPolicyBundle } from './tenantBundle.js';
import { loadAndValidatePolicyBundle, PolicyBundleVerificationResult } from './loader.js';

export interface StoredPolicyBundle {
  versionId: string;
  bundle: TenantPolicyBundle;
  digest: string;
  signatureVerified: boolean;
  schemaValidated: boolean;
  createdAt: string;
  activatedAt?: string;
}

interface BundleState {
  currentPolicyVersionId?: string;
  history: string[];
  bundles: Record<string, StoredPolicyBundle>;
}

function resolveStoragePath(customPath?: string) {
  if (customPath) return customPath;
  const envPath = process.env.POLICY_BUNDLE_STORAGE_PATH;
  if (envPath) return envPath;
  return path.join(process.cwd(), 'data', 'policy-bundles.json');
}

export class PolicyBundleStore {
  private readonly storagePath: string;
  private state: BundleState = { bundles: {}, history: [] };

  constructor(storagePath?: string) {
    this.storagePath = resolveStoragePath(storagePath);
  }

  async loadFromDisk() {
    try {
      const buf = await fs.readFile(this.storagePath, { encoding: 'utf-8' });
      this.state = JSON.parse(String(buf)) as BundleState;
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
      await this.persist();
    }
  }

  async persist() {
    await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
    await fs.writeFile(this.storagePath, JSON.stringify(this.state, null, 2));
  }

  async upsertBundle(
    bundle: TenantPolicyBundle,
    verification: PolicyBundleVerificationResult,
    setCurrent = true,
  ): Promise<StoredPolicyBundle> {
    await this.loadFromDisk();
    const versionId =
      bundle.bundleId || bundle.baseProfile.version || verification.digest.slice(0, 12);

    const record: StoredPolicyBundle = {
      versionId,
      bundle,
      digest: verification.digest,
      signatureVerified: verification.signatureVerified,
      schemaValidated: true,
      createdAt: new Date().toISOString(),
      activatedAt: setCurrent ? new Date().toISOString() : undefined,
    };

    const existing = this.state.bundles[versionId];
    this.state.bundles[versionId] = existing
      ? { ...record, createdAt: existing.createdAt }
      : record;
    if (setCurrent) {
      if (this.state.currentPolicyVersionId && this.state.currentPolicyVersionId !== versionId) {
        this.state.history.push(this.state.currentPolicyVersionId);
      }
      this.state.currentPolicyVersionId = versionId;
      this.state.bundles[versionId].activatedAt = new Date().toISOString();
    }
    await this.persist();
    return record;
  }

  getCurrent(): StoredPolicyBundle | undefined {
    if (!this.state.currentPolicyVersionId) return undefined;
    return this.state.bundles[this.state.currentPolicyVersionId];
  }

  get(versionId: string): StoredPolicyBundle | undefined {
    return this.state.bundles[versionId];
  }

  async rollback(targetVersionId?: string): Promise<StoredPolicyBundle> {
    if (!this.state.currentPolicyVersionId) {
      throw new Error('no active policy to roll back');
    }

    const nextVersion = targetVersionId || this.state.history.pop();
    if (!nextVersion) {
      throw new Error('no previous policy version to roll back to');
    }
    const target = this.state.bundles[nextVersion];
    if (!target) {
      throw new Error(`unknown policy version: ${nextVersion}`);
    }

    if (this.state.currentPolicyVersionId && this.state.currentPolicyVersionId !== nextVersion) {
      this.state.history.push(this.state.currentPolicyVersionId);
    }
    this.state.currentPolicyVersionId = nextVersion;
    this.state.bundles[nextVersion].activatedAt = new Date().toISOString();
    await this.persist();
    return target;
  }

  async resolveEffective(versionId?: string): Promise<StoredPolicyBundle> {
    await this.loadFromDisk();
    const targetId = versionId || this.state.currentPolicyVersionId;
    if (!targetId) throw new Error('no current policy configured');
    const bundle = this.state.bundles[targetId];
    if (!bundle) throw new Error(`policy version not found: ${targetId}`);
    return bundle;
  }

  async resolveRequestBundle(options?: {
    pinnedVersionId?: string;
    tokenPolicyVersionId?: string;
    actionPolicyVersionId?: string;
  }): Promise<StoredPolicyBundle> {
    await this.loadFromDisk();
    const preferredVersion =
      options?.pinnedVersionId || options?.tokenPolicyVersionId || options?.actionPolicyVersionId;

    const targetId = preferredVersion || this.state.currentPolicyVersionId;
    if (!targetId) throw new Error('no current policy configured');

    const bundle = this.state.bundles[targetId];
    if (!bundle) {
      throw new Error(`policy version not found: ${targetId}`);
    }
    return bundle;
  }

  reset() {
    this.state = { bundles: {}, history: [], currentPolicyVersionId: undefined };
  }
}

export const policyBundleStore = new PolicyBundleStore();

export async function reloadPolicyBundle(
  bundlePath: string,
  signaturePath?: string,
) {
  const { bundle, verification } = await loadAndValidatePolicyBundle(bundlePath, signaturePath);
  const record = await policyBundleStore.upsertBundle(bundle, verification, true);
  return record;
}

export async function rollbackPolicyBundle(toVersion?: string) {
  await policyBundleStore.loadFromDisk();
  const record = await policyBundleStore.rollback(toVersion);
  return record;
}
