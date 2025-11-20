/**
 * Revocation Registry
 *
 * Manages revocation of evidence wallets and bundles with:
 * - Distributed revocation lists
 * - Propagation to multiple registries
 * - Signature verification
 * - Offline revocation checking
 */

import { createSign, createVerify } from 'crypto';
import { promises as fs } from 'fs';
import type {
  RevocationRecord,
  EvidenceWallet,
  ProofCarryingManifest,
} from './proof-carrying-types';

export interface RevocationRegistryConfig {
  privateKey: string; // For signing revocations
  publicKey: string;
  registryId: string;
  propagationUrls?: string[]; // Other registries to propagate to
}

export interface RevokeOptions {
  reason: RevocationRecord['reason'];
  reasonDetail?: string;
  revokedBy: string;
  propagate?: boolean;
}

export class RevocationRegistry {
  private config: RevocationRegistryConfig;
  private revocations: Map<string, RevocationRecord> = new Map();
  private revokedWallets: Set<string> = new Set();
  private revokedBundles: Set<string> = new Set();

  constructor(config: RevocationRegistryConfig) {
    this.config = config;
  }

  /**
   * Revoke an evidence wallet
   */
  async revokeWallet(
    wallet: EvidenceWallet,
    options: RevokeOptions
  ): Promise<RevocationRecord> {
    const revocationId = `revoke-${wallet.id}-${Date.now()}`;

    const record: RevocationRecord = {
      id: revocationId,
      walletId: wallet.id,
      bundleId: wallet.bundleId,
      revokedAt: new Date().toISOString(),
      revokedBy: options.revokedBy,
      reason: options.reason,
      reasonDetail: options.reasonDetail,
      propagatedTo: [],
      propagationStatus: 'pending',
      signature: '',
      signatureAlgorithm: 'RSA-SHA256',
    };

    // Sign the revocation
    record.signature = this.signRevocation(record);

    // Store in registry
    this.revocations.set(revocationId, record);
    this.revokedWallets.add(wallet.id);
    this.revokedBundles.add(wallet.bundleId);

    // Propagate if requested
    if (options.propagate && this.config.propagationUrls) {
      await this.propagateRevocation(record);
    }

    return record;
  }

  /**
   * Revoke a bundle (revokes all associated wallets)
   */
  async revokeBundle(
    bundleId: string,
    options: RevokeOptions
  ): Promise<RevocationRecord> {
    const revocationId = `revoke-bundle-${bundleId}-${Date.now()}`;

    const record: RevocationRecord = {
      id: revocationId,
      walletId: '', // Bundle-level revocation
      bundleId,
      revokedAt: new Date().toISOString(),
      revokedBy: options.revokedBy,
      reason: options.reason,
      reasonDetail: options.reasonDetail,
      propagatedTo: [],
      propagationStatus: 'pending',
      signature: '',
      signatureAlgorithm: 'RSA-SHA256',
    };

    // Sign the revocation
    record.signature = this.signRevocation(record);

    // Store in registry
    this.revocations.set(revocationId, record);
    this.revokedBundles.add(bundleId);

    // Propagate if requested
    if (options.propagate && this.config.propagationUrls) {
      await this.propagateRevocation(record);
    }

    return record;
  }

  /**
   * Check if a wallet is revoked
   */
  isWalletRevoked(walletId: string): boolean {
    return this.revokedWallets.has(walletId);
  }

  /**
   * Check if a bundle is revoked
   */
  isBundleRevoked(bundleId: string): boolean {
    return this.revokedBundles.has(bundleId);
  }

  /**
   * Get revocation record
   */
  getRevocation(revocationId: string): RevocationRecord | undefined {
    return this.revocations.get(revocationId);
  }

  /**
   * Get all revocations for a wallet
   */
  getWalletRevocations(walletId: string): RevocationRecord[] {
    return Array.from(this.revocations.values()).filter(
      r => r.walletId === walletId
    );
  }

  /**
   * Get all revocations for a bundle
   */
  getBundleRevocations(bundleId: string): RevocationRecord[] {
    return Array.from(this.revocations.values()).filter(
      r => r.bundleId === bundleId
    );
  }

  /**
   * Sign a revocation record
   */
  private signRevocation(record: RevocationRecord): string {
    const data = JSON.stringify({
      id: record.id,
      walletId: record.walletId,
      bundleId: record.bundleId,
      revokedAt: record.revokedAt,
      revokedBy: record.revokedBy,
      reason: record.reason,
      reasonDetail: record.reasonDetail,
    });

    const sign = createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(this.config.privateKey, 'hex');
  }

  /**
   * Verify a revocation signature
   */
  verifyRevocation(record: RevocationRecord): boolean {
    const data = JSON.stringify({
      id: record.id,
      walletId: record.walletId,
      bundleId: record.bundleId,
      revokedAt: record.revokedAt,
      revokedBy: record.revokedBy,
      reason: record.reason,
      reasonDetail: record.reasonDetail,
    });

    const verify = createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(this.config.publicKey, record.signature, 'hex');
  }

  /**
   * Propagate revocation to other registries
   */
  private async propagateRevocation(
    record: RevocationRecord
  ): Promise<void> {
    if (!this.config.propagationUrls || this.config.propagationUrls.length === 0) {
      record.propagationStatus = 'complete';
      return;
    }

    const propagationResults = await Promise.allSettled(
      this.config.propagationUrls.map(url =>
        this.propagateToRegistry(url, record)
      )
    );

    // Track successful propagations
    const successful: string[] = [];
    propagationResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(this.config.propagationUrls![index]);
      }
    });

    record.propagatedTo = successful;
    record.propagationStatus =
      successful.length === this.config.propagationUrls.length
        ? 'complete'
        : successful.length > 0
        ? 'partial'
        : 'failed';
  }

  /**
   * Propagate to a single registry
   */
  private async propagateToRegistry(
    url: string,
    record: RevocationRecord
  ): Promise<void> {
    // In production, this would make an HTTP request to the registry
    // For now, we'll simulate the propagation
    console.log(`Propagating revocation ${record.id} to ${url}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // In real implementation:
    // const response = await fetch(url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(record),
    // });
    //
    // if (!response.ok) {
    //   throw new Error(`Propagation failed: ${response.statusText}`);
    // }
  }

  /**
   * Export revocation list for offline verification
   */
  async exportRevocationList(outputPath: string): Promise<void> {
    const list = {
      registryId: this.config.registryId,
      exportedAt: new Date().toISOString(),
      revocations: Array.from(this.revocations.values()),
      revokedWallets: Array.from(this.revokedWallets),
      revokedBundles: Array.from(this.revokedBundles),
    };

    await fs.writeFile(outputPath, JSON.stringify(list, null, 2), 'utf8');
  }

  /**
   * Import revocation list
   */
  async importRevocationList(inputPath: string): Promise<void> {
    const content = await fs.readFile(inputPath, 'utf8');
    const list = JSON.parse(content);

    // Verify each revocation signature
    for (const record of list.revocations) {
      if (this.verifyRevocation(record)) {
        this.revocations.set(record.id, record);
        if (record.walletId) {
          this.revokedWallets.add(record.walletId);
        }
        if (record.bundleId) {
          this.revokedBundles.add(record.bundleId);
        }
      } else {
        console.warn(`Invalid revocation signature for ${record.id}`);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRevocations: number;
    revokedWallets: number;
    revokedBundles: number;
    byReason: Record<string, number>;
    propagationStatus: Record<string, number>;
  } {
    const byReason: Record<string, number> = {};
    const propagationStatus: Record<string, number> = {};

    for (const record of this.revocations.values()) {
      byReason[record.reason] = (byReason[record.reason] || 0) + 1;
      propagationStatus[record.propagationStatus] =
        (propagationStatus[record.propagationStatus] || 0) + 1;
    }

    return {
      totalRevocations: this.revocations.size,
      revokedWallets: this.revokedWallets.size,
      revokedBundles: this.revokedBundles.size,
      byReason,
      propagationStatus,
    };
  }

  /**
   * Clean up expired revocations
   */
  cleanupExpired(retentionDays: number = 365): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    for (const [id, record] of this.revocations.entries()) {
      const revokedDate = new Date(record.revokedAt);
      if (revokedDate < cutoffDate) {
        this.revocations.delete(id);
      }
    }
  }
}

/**
 * Distributed Revocation Checker
 * Checks multiple registries for revocation status
 */
export class DistributedRevocationChecker {
  private registries: RevocationRegistry[] = [];

  constructor(registries: RevocationRegistry[] = []) {
    this.registries = registries;
  }

  /**
   * Add a registry
   */
  addRegistry(registry: RevocationRegistry): void {
    this.registries.push(registry);
  }

  /**
   * Check if wallet is revoked in any registry
   */
  isWalletRevoked(walletId: string): boolean {
    return this.registries.some(registry =>
      registry.isWalletRevoked(walletId)
    );
  }

  /**
   * Check if bundle is revoked in any registry
   */
  isBundleRevoked(bundleId: string): boolean {
    return this.registries.some(registry =>
      registry.isBundleRevoked(bundleId)
    );
  }

  /**
   * Get all revocation records for a wallet across registries
   */
  getWalletRevocations(walletId: string): RevocationRecord[] {
    const records: RevocationRecord[] = [];
    for (const registry of this.registries) {
      records.push(...registry.getWalletRevocations(walletId));
    }
    return records;
  }

  /**
   * Get all revocation records for a bundle across registries
   */
  getBundleRevocations(bundleId: string): RevocationRecord[] {
    const records: RevocationRecord[] = [];
    for (const registry of this.registries) {
      records.push(...registry.getBundleRevocations(bundleId));
    }
    return records;
  }

  /**
   * Fetch revocation lists from URLs for offline checking
   */
  async fetchRevocationLists(urls: string[]): Promise<void> {
    for (const url of urls) {
      try {
        // In production, fetch from URL
        // For now, simulate
        console.log(`Fetching revocation list from ${url}`);

        // const response = await fetch(url);
        // const list = await response.json();
        //
        // const registry = new RevocationRegistry({...config});
        // await registry.importRevocationList(list);
        // this.addRegistry(registry);
      } catch (error) {
        console.warn(`Failed to fetch revocation list from ${url}:`, error);
      }
    }
  }
}

/**
 * Create revocation registry with database persistence
 */
export interface DatabaseAdapter {
  saveRevocation(record: RevocationRecord): Promise<void>;
  loadRevocations(): Promise<RevocationRecord[]>;
  checkRevoked(walletId: string, bundleId: string): Promise<boolean>;
}

export class PersistentRevocationRegistry extends RevocationRegistry {
  private db: DatabaseAdapter;

  constructor(
    config: RevocationRegistryConfig,
    db: DatabaseAdapter
  ) {
    super(config);
    this.db = db;
  }

  /**
   * Initialize from database
   */
  async initialize(): Promise<void> {
    const records = await this.db.loadRevocations();
    for (const record of records) {
      // Verify and load each record
      if (this.verifyRevocation(record)) {
        this['revocations'].set(record.id, record);
        if (record.walletId) {
          this['revokedWallets'].add(record.walletId);
        }
        if (record.bundleId) {
          this['revokedBundles'].add(record.bundleId);
        }
      }
    }
  }

  /**
   * Override revoke methods to persist to database
   */
  async revokeWallet(
    wallet: EvidenceWallet,
    options: RevokeOptions
  ): Promise<RevocationRecord> {
    const record = await super.revokeWallet(wallet, options);
    await this.db.saveRevocation(record);
    return record;
  }

  async revokeBundle(
    bundleId: string,
    options: RevokeOptions
  ): Promise<RevocationRecord> {
    const record = await super.revokeBundle(bundleId, options);
    await this.db.saveRevocation(record);
    return record;
  }
}
