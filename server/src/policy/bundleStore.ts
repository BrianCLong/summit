import { EventEmitter } from 'node:events';
import path from 'node:path';
import { loadSignedPolicy } from './loader.js';

export type PolicyBundleRecord = {
  versionId: string;
  sourcePath: string;
  signatureVerified: boolean;
  digest: string;
  size: number;
  modified: Date;
  loadedAt: Date;
  loader: string;
};

export type PolicyResolution = {
  versionId: string;
  record: PolicyBundleRecord;
  pinned: boolean;
};

export class PolicyBundleStore extends EventEmitter {
  private bundles: Map<string, PolicyBundleRecord> = new Map();
  private currentVersionId?: string;

  async loadBundle(input: {
    bundlePath: string;
    sigPath?: string;
    versionId?: string;
    loader?: string;
  }): Promise<PolicyBundleRecord> {
    const verification = await loadSignedPolicy(input.bundlePath, input.sigPath);
    const versionId = input.versionId || verification.digest;

    const record: PolicyBundleRecord = {
      versionId,
      sourcePath: path.resolve(input.bundlePath),
      signatureVerified: verification.signatureVerified,
      digest: verification.digest,
      size: verification.size,
      modified: verification.modified,
      loadedAt: new Date(),
      loader: input.loader || 'system',
    };

    this.bundles.set(versionId, record);
    this.currentVersionId = versionId;
    this.emit('reloaded', record);
    return record;
  }

  rollback(toVersionId: string): PolicyBundleRecord {
    const record = this.bundles.get(toVersionId);
    if (!record) {
      throw new Error(`policy version ${toVersionId} not found`);
    }
    this.currentVersionId = toVersionId;
    this.emit('rollback', record);
    return record;
  }

  resolveVersion(pinnedVersionId?: string): PolicyResolution {
    if (pinnedVersionId) {
      const pinned = this.bundles.get(pinnedVersionId);
      if (pinned) {
        return { versionId: pinnedVersionId, record: pinned, pinned: true };
      }
    }
    const current = this.currentVersionId
      ? this.bundles.get(this.currentVersionId)
      : undefined;
    if (!current || !this.currentVersionId) {
      throw new Error('no policy has been loaded');
    }
    return { versionId: this.currentVersionId, record: current, pinned: false };
  }

  getCurrentVersionId(): string | undefined {
    return this.currentVersionId;
  }

  get versions(): string[] {
    return Array.from(this.bundles.keys());
  }

  resetForTests() {
    this.bundles.clear();
    this.currentVersionId = undefined;
    this.removeAllListeners();
  }
}

export const policyBundleStore = new PolicyBundleStore();
