/**
 * Permission Auditor - Immutable audit trail for all data pool operations
 */

import crypto from 'crypto';
import type { Contribution, AccessRequest } from './index.js';

interface AuditEntry {
  id: string;
  timestamp: Date;
  type: 'contribution' | 'access_request' | 'data_access' | 'permission_change';
  poolId: string;
  actorId: string;
  action: string;
  details: Record<string, unknown>;
  hash: string;
  previousHash: string;
}

interface AccessResult {
  granted: boolean;
  accessToken?: string;
  reason?: string;
}

export class PermissionAuditor {
  private auditLog: Map<string, AuditEntry[]> = new Map();
  private latestHash: Map<string, string> = new Map();

  async logContribution(contribution: Contribution): Promise<AuditEntry> {
    return this.addEntry({
      type: 'contribution',
      poolId: contribution.poolId,
      actorId: contribution.contributorId,
      action: 'DATA_CONTRIBUTED',
      details: {
        contentHash: contribution.metadata.contentHash,
        size: contribution.metadata.size,
        mimeType: contribution.metadata.mimeType,
      },
    });
  }

  async logAccessRequest(
    request: AccessRequest,
    result: AccessResult,
  ): Promise<AuditEntry> {
    return this.addEntry({
      type: 'access_request',
      poolId: request.poolId,
      actorId: request.requesterId,
      action: result.granted ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
      details: {
        purpose: request.purpose,
        attestations: request.attestations,
        reason: result.reason,
      },
    });
  }

  async logDataAccess(
    poolId: string,
    accessToken: string,
    query?: string,
  ): Promise<AuditEntry> {
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    return this.addEntry({
      type: 'data_access',
      poolId,
      actorId: tokenHash.substring(0, 16), // Anonymized token reference
      action: 'DATA_ACCESSED',
      details: { query, tokenPrefix: tokenHash.substring(0, 8) },
    });
  }

  async logPermissionChange(
    poolId: string,
    adminId: string,
    change: { type: string; target: string; newPermission: string },
  ): Promise<AuditEntry> {
    return this.addEntry({
      type: 'permission_change',
      poolId,
      actorId: adminId,
      action: 'PERMISSION_CHANGED',
      details: change,
    });
  }

  async getAuditLog(poolId: string, from?: string, to?: string): Promise<AuditEntry[]> {
    const entries = this.auditLog.get(poolId) || [];

    return entries.filter((entry) => {
      if (from && entry.timestamp < new Date(from)) return false;
      if (to && entry.timestamp > new Date(to)) return false;
      return true;
    });
  }

  async verifyAuditChain(poolId: string): Promise<boolean> {
    const entries = this.auditLog.get(poolId) || [];
    if (entries.length === 0) return true;

    for (let i = 1; i < entries.length; i++) {
      if (entries[i].previousHash !== entries[i - 1].hash) {
        return false;
      }
      // Verify entry hash
      const computedHash = this.computeEntryHash(entries[i]);
      if (computedHash !== entries[i].hash) {
        return false;
      }
    }

    return true;
  }

  async exportAuditProof(poolId: string): Promise<{
    entries: AuditEntry[];
    merkleRoot: string;
    timestamp: Date;
  }> {
    const entries = this.auditLog.get(poolId) || [];
    const merkleRoot = this.computeMerkleRoot(entries.map((e) => e.hash));

    return {
      entries,
      merkleRoot,
      timestamp: new Date(),
    };
  }

  private addEntry(
    data: Omit<AuditEntry, 'id' | 'timestamp' | 'hash' | 'previousHash'>,
  ): AuditEntry {
    const previousHash = this.latestHash.get(data.poolId) || '0'.repeat(64);
    const id = crypto.randomUUID();
    const timestamp = new Date();

    const entry: AuditEntry = {
      id,
      timestamp,
      ...data,
      previousHash,
      hash: '', // Computed below
    };

    entry.hash = this.computeEntryHash(entry);

    const poolLog = this.auditLog.get(data.poolId) || [];
    poolLog.push(entry);
    this.auditLog.set(data.poolId, poolLog);
    this.latestHash.set(data.poolId, entry.hash);

    return entry;
  }

  private computeEntryHash(entry: AuditEntry): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      type: entry.type,
      poolId: entry.poolId,
      actorId: entry.actorId,
      action: entry.action,
      details: entry.details,
      previousHash: entry.previousHash,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return '0'.repeat(64);
    if (hashes.length === 1) return hashes[0];

    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      const combined = crypto.createHash('sha256').update(left + right).digest('hex');
      nextLevel.push(combined);
    }

    return this.computeMerkleRoot(nextLevel);
  }
}
