// Conductor Audit Integrity Hash-Chain Verifier
// Provides cryptographic verification of audit trail integrity using hash chains

import { createHash, createHmac } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface AuditRecord {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  expert?: string;
  taskHash: string;
  result: 'success' | 'error' | 'denied';
  cost?: number;
  latencyMs?: number;
  securityHash?: string;
  metadata?: Record<string, any>;
}

export interface ChainLink {
  auditId: string;
  previousHash: string;
  currentHash: string;
  timestamp: number;
  sequenceNumber: number;
}

export interface ChainIntegrityReport {
  isValid: boolean;
  totalRecords: number;
  verifiedRecords: number;
  brokenChains: number;
  firstCorruptedRecord?: string;
  lastVerifiedRecord?: string;
  integrityPercentage: number;
  verificationTimestamp: number;
}

export class AuditChainVerifier {
  private chainPath: string;
  private secretKey: string;
  private hashAlgorithm: string;

  constructor(
    chainPath = './data/audit',
    secretKey = process.env.AUDIT_CHAIN_SECRET ||
      'default-secret-change-in-production',
    hashAlgorithm = 'sha256',
  ) {
    this.chainPath = chainPath;
    this.secretKey = secretKey;
    this.hashAlgorithm = hashAlgorithm;
  }

  /**
   * Add an audit record to the hash chain
   */
  public addRecord(record: AuditRecord): ChainLink {
    const previousHash = this.getLastHash();
    const sequenceNumber = this.getNextSequenceNumber();

    // Create deterministic hash of the audit record
    const recordHash = this.hashAuditRecord(record);

    // Create chain link hash that includes previous hash
    const chainHash = this.createChainHash(
      recordHash,
      previousHash,
      sequenceNumber,
    );

    const chainLink: ChainLink = {
      auditId: record.id,
      previousHash,
      currentHash: chainHash,
      timestamp: record.timestamp,
      sequenceNumber,
    };

    // Store both the audit record and chain link
    this.storeRecord(record, chainLink);

    return chainLink;
  }

  /**
   * Verify the integrity of the entire audit chain
   */
  public async verifyChainIntegrity(): Promise<ChainIntegrityReport> {
    const records = this.loadAllRecords();
    const chains = this.loadAllChainLinks();

    if (records.length === 0) {
      return {
        isValid: true,
        totalRecords: 0,
        verifiedRecords: 0,
        brokenChains: 0,
        integrityPercentage: 100,
        verificationTimestamp: Date.now(),
      };
    }

    let verifiedRecords = 0;
    let brokenChains = 0;
    let firstCorruptedRecord: string | undefined;
    let lastVerifiedRecord: string | undefined;

    // Verify each record and its chain link
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const chainLink = chains.find((c) => c.auditId === record.id);

      if (!chainLink) {
        brokenChains++;
        if (!firstCorruptedRecord) firstCorruptedRecord = record.id;
        continue;
      }

      // Verify record hash
      const expectedRecordHash = this.hashAuditRecord(record);
      const previousHash =
        i === 0 ? 'genesis' : chains[i - 1]?.currentHash || 'genesis';
      const expectedChainHash = this.createChainHash(
        expectedRecordHash,
        previousHash,
        chainLink.sequenceNumber,
      );

      if (chainLink.currentHash === expectedChainHash) {
        verifiedRecords++;
        lastVerifiedRecord = record.id;
      } else {
        brokenChains++;
        if (!firstCorruptedRecord) firstCorruptedRecord = record.id;
      }

      // Verify chain continuity
      if (i > 0) {
        const previousLink = chains[i - 1];
        if (chainLink.previousHash !== previousLink?.currentHash) {
          brokenChains++;
          if (!firstCorruptedRecord) firstCorruptedRecord = record.id;
        }
      }
    }

    const integrityPercentage =
      records.length > 0 ? (verifiedRecords / records.length) * 100 : 100;

    return {
      isValid: brokenChains === 0,
      totalRecords: records.length,
      verifiedRecords,
      brokenChains,
      firstCorruptedRecord,
      lastVerifiedRecord,
      integrityPercentage: Math.round(integrityPercentage * 100) / 100,
      verificationTimestamp: Date.now(),
    };
  }

  /**
   * Verify a specific audit record
   */
  public verifyRecord(recordId: string): { isValid: boolean; reason?: string } {
    const record = this.loadRecord(recordId);
    const chainLink = this.loadChainLink(recordId);

    if (!record) {
      return { isValid: false, reason: 'Record not found' };
    }

    if (!chainLink) {
      return { isValid: false, reason: 'Chain link not found' };
    }

    // Verify record hash
    const expectedRecordHash = this.hashAuditRecord(record);
    const expectedChainHash = this.createChainHash(
      expectedRecordHash,
      chainLink.previousHash,
      chainLink.sequenceNumber,
    );

    if (chainLink.currentHash !== expectedChainHash) {
      return { isValid: false, reason: 'Hash mismatch' };
    }

    return { isValid: true };
  }

  /**
   * Generate integrity proof for a range of records
   */
  public generateIntegrityProof(
    fromRecordId: string,
    toRecordId: string,
  ): {
    proof: string;
    records: string[];
    timestamp: number;
  } {
    const records = this.loadRecordRange(fromRecordId, toRecordId);
    const chains = records.map((r) => this.loadChainLink(r.id)).filter(Boolean);

    // Create merkle-like proof structure
    const recordHashes = records.map((r) => this.hashAuditRecord(r));
    const chainHashes = chains.map((c) => c!.currentHash);

    const proofData = {
      fromRecord: fromRecordId,
      toRecord: toRecordId,
      recordCount: records.length,
      recordHashes,
      chainHashes,
      timestamp: Date.now(),
    };

    const proof = this.createHmac(JSON.stringify(proofData));

    return {
      proof,
      records: records.map((r) => r.id),
      timestamp: proofData.timestamp,
    };
  }

  /**
   * Verify an integrity proof
   */
  public verifyIntegrityProof(
    proof: string,
    fromRecordId: string,
    toRecordId: string,
  ): boolean {
    const records = this.loadRecordRange(fromRecordId, toRecordId);
    const chains = records.map((r) => this.loadChainLink(r.id)).filter(Boolean);

    const recordHashes = records.map((r) => this.hashAuditRecord(r));
    const chainHashes = chains.map((c) => c!.currentHash);

    const proofData = {
      fromRecord: fromRecordId,
      toRecord: toRecordId,
      recordCount: records.length,
      recordHashes,
      chainHashes,
      timestamp: Date.now(),
    };

    const expectedProof = this.createHmac(JSON.stringify(proofData));
    return proof === expectedProof;
  }

  /**
   * Export audit trail for compliance
   */
  public exportAuditTrail(
    fromTimestamp: number,
    toTimestamp: number,
  ): {
    records: AuditRecord[];
    integrityReport: ChainIntegrityReport;
    exportTimestamp: number;
    exportHash: string;
  } {
    const allRecords = this.loadAllRecords();
    const filteredRecords = allRecords.filter(
      (r) => r.timestamp >= fromTimestamp && r.timestamp <= toTimestamp,
    );

    const integrityReport = {
      ...this.verifyChainIntegrity(),
      // Override with filtered data
      totalRecords: filteredRecords.length,
      verifiedRecords: filteredRecords.filter(
        (r) => this.verifyRecord(r.id).isValid,
      ).length,
    } as any;

    const exportData = {
      records: filteredRecords,
      integrityReport,
      exportTimestamp: Date.now(),
      exportHash: '',
    };

    // Create tamper-evident export hash
    exportData.exportHash = this.createHash(
      JSON.stringify({
        recordCount: filteredRecords.length,
        fromTimestamp,
        toTimestamp,
        integrityPercentage: integrityReport.integrityPercentage,
      }),
    );

    return exportData;
  }

  // Private helper methods

  private hashAuditRecord(record: AuditRecord): string {
    const hashData = {
      id: record.id,
      timestamp: record.timestamp,
      userId: record.userId,
      action: record.action,
      expert: record.expert || '',
      taskHash: record.taskHash,
      result: record.result,
      cost: record.cost || 0,
      latencyMs: record.latencyMs || 0,
    };

    return this.createHash(JSON.stringify(hashData));
  }

  private createChainHash(
    recordHash: string,
    previousHash: string,
    sequenceNumber: number,
  ): string {
    const chainData = {
      recordHash,
      previousHash,
      sequenceNumber,
      timestamp: Date.now(),
    };

    return this.createHmac(JSON.stringify(chainData));
  }

  private createHash(data: string): string {
    return createHash(this.hashAlgorithm).update(data).digest('hex');
  }

  private createHmac(data: string): string {
    return createHmac(this.hashAlgorithm, this.secretKey)
      .update(data)
      .digest('hex');
  }

  private getLastHash(): string {
    const chains = this.loadAllChainLinks();
    if (chains.length === 0) {
      return 'genesis';
    }
    return chains[chains.length - 1].currentHash;
  }

  private getNextSequenceNumber(): number {
    const chains = this.loadAllChainLinks();
    if (chains.length === 0) {
      return 1;
    }
    return Math.max(...chains.map((c) => c.sequenceNumber)) + 1;
  }

  private storeRecord(record: AuditRecord, chainLink: ChainLink): void {
    // Ensure directory exists
    const fs = require('fs');
    if (!fs.existsSync(this.chainPath)) {
      fs.mkdirSync(this.chainPath, { recursive: true });
    }

    // Store record
    const recordPath = join(this.chainPath, `record-${record.id}.json`);
    writeFileSync(recordPath, JSON.stringify(record, null, 2));

    // Store chain link
    const chainPath = join(this.chainPath, `chain-${record.id}.json`);
    writeFileSync(chainPath, JSON.stringify(chainLink, null, 2));

    // Update index
    this.updateIndex(record, chainLink);
  }

  private updateIndex(record: AuditRecord, chainLink: ChainLink): void {
    const indexPath = join(this.chainPath, 'index.json');
    let index: any[] = [];

    if (existsSync(indexPath)) {
      try {
        index = JSON.parse(readFileSync(indexPath, 'utf8'));
      } catch (error) {
        console.warn('Failed to read audit index, creating new one');
      }
    }

    index.push({
      id: record.id,
      timestamp: record.timestamp,
      sequenceNumber: chainLink.sequenceNumber,
      hash: chainLink.currentHash,
    });

    // Sort by sequence number
    index.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  private loadRecord(recordId: string): AuditRecord | null {
    const recordPath = join(this.chainPath, `record-${recordId}.json`);
    if (!existsSync(recordPath)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(recordPath, 'utf8'));
    } catch (error) {
      console.error(`Failed to load audit record ${recordId}:`, error);
      return null;
    }
  }

  private loadChainLink(recordId: string): ChainLink | null {
    const chainPath = join(this.chainPath, `chain-${recordId}.json`);
    if (!existsSync(chainPath)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(chainPath, 'utf8'));
    } catch (error) {
      console.error(`Failed to load chain link ${recordId}:`, error);
      return null;
    }
  }

  private loadAllRecords(): AuditRecord[] {
    const indexPath = join(this.chainPath, 'index.json');
    if (!existsSync(indexPath)) {
      return [];
    }

    try {
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));
      return index
        .map((entry: any) => this.loadRecord(entry.id))
        .filter(Boolean);
    } catch (error) {
      console.error('Failed to load audit index:', error);
      return [];
    }
  }

  private loadAllChainLinks(): ChainLink[] {
    const indexPath = join(this.chainPath, 'index.json');
    if (!existsSync(indexPath)) {
      return [];
    }

    try {
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));
      return index
        .map((entry: any) => this.loadChainLink(entry.id))
        .filter(Boolean);
    } catch (error) {
      console.error('Failed to load chain index:', error);
      return [];
    }
  }

  private loadRecordRange(
    fromRecordId: string,
    toRecordId: string,
  ): AuditRecord[] {
    const allRecords = this.loadAllRecords();
    const fromIndex = allRecords.findIndex((r) => r.id === fromRecordId);
    const toIndex = allRecords.findIndex((r) => r.id === toRecordId);

    if (fromIndex === -1 || toIndex === -1) {
      return [];
    }

    return allRecords.slice(fromIndex, toIndex + 1);
  }
}

// Singleton instance for application use
export const auditChainVerifier = new AuditChainVerifier(
  process.env.AUDIT_CHAIN_PATH || './data/audit',
  process.env.AUDIT_CHAIN_SECRET,
  process.env.AUDIT_HASH_ALGORITHM || 'sha256',
);

/**
 * Utility functions for conductor integration
 */
export function recordConductorAudit(
  auditId: string,
  userId: string,
  action: string,
  taskHash: string,
  result: 'success' | 'error' | 'denied',
  expert?: string,
  cost?: number,
  latencyMs?: number,
  securityHash?: string,
  metadata?: Record<string, any>,
): ChainLink {
  const record: AuditRecord = {
    id: auditId,
    timestamp: Date.now(),
    userId,
    action,
    taskHash,
    result,
    expert,
    cost,
    latencyMs,
    securityHash,
    metadata,
  };

  return auditChainVerifier.addRecord(record);
}

/**
 * Scheduled integrity verification
 */
export async function performScheduledIntegrityCheck(): Promise<ChainIntegrityReport> {
  const report = await auditChainVerifier.verifyChainIntegrity();

  // Log results
  if (report.isValid) {
    console.log('✅ Audit chain integrity verified:', {
      totalRecords: report.totalRecords,
      integrityPercentage: report.integrityPercentage,
    });
  } else {
    console.error('🚨 Audit chain integrity compromised:', {
      totalRecords: report.totalRecords,
      verifiedRecords: report.verifiedRecords,
      brokenChains: report.brokenChains,
      firstCorruptedRecord: report.firstCorruptedRecord,
      integrityPercentage: report.integrityPercentage,
    });
  }

  return report;
}
